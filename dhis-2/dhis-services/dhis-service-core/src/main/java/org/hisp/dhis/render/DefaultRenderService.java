package org.hisp.dhis.render;

/*
 * Copyright (c) 2004-2020, University of Oslo
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * Neither the name of the HISP project nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import static com.google.common.base.Preconditions.checkNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.*;

import org.hisp.dhis.common.IdentifiableObject;
import org.hisp.dhis.commons.config.jackson.EmptyStringToNullStdDeserializer;
import org.hisp.dhis.commons.config.jackson.ParseDateStdDeserializer;
import org.hisp.dhis.commons.config.jackson.WriteDateStdSerializer;
import org.hisp.dhis.metadata.version.MetadataVersion;
import org.hisp.dhis.node.geometry.JtsXmlModule;
import org.hisp.dhis.schema.Schema;
import org.hisp.dhis.schema.SchemaService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.bedatadriven.jackson.datatype.jts.JtsModule;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.util.JSONPObject;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.fasterxml.jackson.dataformat.xml.ser.ToXmlGenerator;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.PrecisionModel;

import lombok.extern.slf4j.Slf4j;

/**
 * Default implementation that uses Jackson to serialize/deserialize
 *
 * @author Morten Olav Hansen <mortenoh@gmail.com>
 */
@Slf4j
@Service( "org.hisp.dhis.render.RenderService" )
public class DefaultRenderService
    implements RenderService
{
    private static final ObjectMapper jsonMapper = new ObjectMapper();

    private static final XmlMapper xmlMapper = new XmlMapper();

    private SchemaService schemaService;

    public DefaultRenderService( SchemaService schemaService )
    {
        checkNotNull( schemaService );

        this.schemaService = schemaService;
    }

    //--------------------------------------------------------------------------
    // RenderService
    //--------------------------------------------------------------------------

    @Override
    public void toJson( OutputStream output, Object value )
        throws IOException
    {
        jsonMapper.writeValue( output, value );
    }

    @Override
    public String toJsonAsString( Object value )
    {
        try
        {
            return jsonMapper.writeValueAsString( value );
        }
        catch ( JsonProcessingException ignored )
        {
            ignored.printStackTrace();
        }

        return null;
    }

    @Override
    public void toJsonP( OutputStream output, Object value, String callback )
        throws IOException
    {
        if ( StringUtils.isEmpty( callback ) )
        {
            callback = "callback";
        }

        jsonMapper.writeValue( output, new JSONPObject( callback, value ) );
    }

    @Override
    public <T> T fromJson( InputStream input, Class<T> klass )
        throws IOException
    {
        return jsonMapper.readValue( input, klass );
    }

    @Override
    public <T> T fromJson( String input, Class<T> klass )
        throws IOException
    {
        return jsonMapper.readValue( input, klass );
    }

    @Override
    public <T> void toXml( OutputStream output, T value )
        throws IOException
    {
        xmlMapper.writeValue( output, value );
    }

    @Override
    public <T> T fromXml( InputStream input, Class<T> klass )
        throws IOException
    {
        return xmlMapper.readValue( input, klass );
    }

    @Override
    public <T> T fromXml( String input, Class<T> klass )
        throws IOException
    {
        return xmlMapper.readValue( input, klass );
    }

    @Override
    public boolean isValidJson( String json )
        throws IOException
    {
        try
        {
            jsonMapper.readValue( json, Object.class );
        }
        catch ( JsonParseException | JsonMappingException e )
        {
            return false;
        }

        return true;
    }

    @Override
    public JsonNode getSystemObject( InputStream inputStream, RenderFormat format ) throws IOException
    {
        ObjectMapper mapper;

        if ( RenderFormat.JSON == format )
        {
            mapper = jsonMapper;
        }
        else if ( RenderFormat.XML == format )
        {
            throw new IllegalArgumentException( "XML format is not supported." );
        }
        else
        {
            return null;
        }

        JsonNode rootNode = mapper.readTree( inputStream );

        return rootNode.get( "system" );
    }

    @Override
    @SuppressWarnings( "unchecked" )
    public Map<Class<? extends IdentifiableObject>, List<IdentifiableObject>> fromMetadata( InputStream inputStream, RenderFormat format ) throws IOException
    {
        Map<Class<? extends IdentifiableObject>, List<IdentifiableObject>> map = new HashMap<>();

        ObjectMapper mapper;

        if ( RenderFormat.JSON == format )
        {
            mapper = jsonMapper;
        }
        else if ( RenderFormat.XML == format )
        {
            throw new IllegalArgumentException( "XML format is not supported." );
        }
        else
        {
            return map;
        }

        JsonNode rootNode = mapper.readTree( inputStream );
        Iterator<String> fieldNames = rootNode.fieldNames();

        while ( fieldNames.hasNext() )
        {
            String fieldName = fieldNames.next();
            JsonNode node = rootNode.get( fieldName );
            Schema schema = schemaService.getSchemaByPluralName( fieldName );

            if ( schema == null || !schema.isIdentifiableObject() )
            {
                log.info( "Skipping unknown property '" + fieldName + "'." );
                continue;
            }

            if ( !schema.isMetadata() )
            {
                log.debug( "Skipping non-metadata property `" + fieldName + "`." );
                continue;
            }

            List<IdentifiableObject> collection = new ArrayList<>();

            for ( JsonNode item : node )
            {
                IdentifiableObject value = mapper.treeToValue( item, (Class<? extends IdentifiableObject>) schema.getKlass() );
                if ( value != null ) collection.add( value );
            }

            map.put( (Class<? extends IdentifiableObject>) schema.getKlass(), collection );
        }

        return map;
    }

    @Override
    public List<MetadataVersion> fromMetadataVersion( InputStream versions, RenderFormat format ) throws IOException
    {
        List<MetadataVersion> metadataVersions = new ArrayList<>();

        if ( RenderFormat.JSON == format )
        {
            JsonNode rootNode = jsonMapper.readTree( versions );

            if ( rootNode != null )
            {
                JsonNode versionsNode = rootNode.get( "metadataversions" );

                if ( versionsNode instanceof ArrayNode )
                {
                    ArrayNode arrayVersionsNode = (ArrayNode) versionsNode;
                    metadataVersions = jsonMapper.readValue( arrayVersionsNode.toString().getBytes(), new TypeReference<List<MetadataVersion>>()
                    {
                    } );
                }
            }
        }

        return metadataVersions;
    }

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------

    public static ObjectMapper getJsonMapper()
    {
        return jsonMapper;
    }

    public static XmlMapper getXmlMapper()
    {
        return xmlMapper;
    }

    static
    {
        SimpleModule module = new SimpleModule();
        module.addDeserializer( String.class, new EmptyStringToNullStdDeserializer() );
        module.addDeserializer( Date.class, new ParseDateStdDeserializer() );
        module.addSerializer( Date.class, new WriteDateStdSerializer() );

        ObjectMapper[] objectMappers = new ObjectMapper[]{ jsonMapper, xmlMapper };

        for ( ObjectMapper objectMapper : objectMappers )
        {
            objectMapper.registerModules( module,
                new JtsModule( new GeometryFactory( new PrecisionModel(), 4326 ) ),
                new JavaTimeModule(),
                new Jdk8Module()
            );

            objectMapper.setSerializationInclusion( JsonInclude.Include.NON_NULL );
            objectMapper.disable( SerializationFeature.WRITE_DATES_AS_TIMESTAMPS );
            objectMapper.disable( SerializationFeature.WRITE_EMPTY_JSON_ARRAYS );
            objectMapper.disable( SerializationFeature.FAIL_ON_EMPTY_BEANS );
            objectMapper.enable( SerializationFeature.WRAP_EXCEPTIONS );

            objectMapper.disable( DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES );
            objectMapper.disable( DeserializationFeature.FAIL_ON_MISSING_EXTERNAL_TYPE_ID_PROPERTY );
            objectMapper.enable( DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES );
            objectMapper.enable( DeserializationFeature.WRAP_EXCEPTIONS );

            objectMapper.disable( MapperFeature.AUTO_DETECT_FIELDS );
            objectMapper.disable( MapperFeature.AUTO_DETECT_CREATORS );
            objectMapper.disable( MapperFeature.AUTO_DETECT_GETTERS );
            objectMapper.disable( MapperFeature.AUTO_DETECT_SETTERS );
            objectMapper.disable( MapperFeature.AUTO_DETECT_IS_GETTERS );
        }

        jsonMapper.getFactory().enable( JsonGenerator.Feature.QUOTE_FIELD_NAMES );
        xmlMapper.enable( ToXmlGenerator.Feature.WRITE_XML_DECLARATION );
        xmlMapper.registerModule( new JtsXmlModule() );
    }
}
