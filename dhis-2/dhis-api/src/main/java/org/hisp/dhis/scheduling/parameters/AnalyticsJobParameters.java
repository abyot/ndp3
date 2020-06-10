package org.hisp.dhis.scheduling.parameters;

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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import org.hisp.dhis.analytics.AnalyticsTableType;
import org.hisp.dhis.common.DxfNamespaces;
import org.hisp.dhis.feedback.ErrorReport;
import org.hisp.dhis.scheduling.JobParameters;
import org.hisp.dhis.scheduling.parameters.jackson.AnalyticsJobParametersDeserializer;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * @author Henning Håkonsen
 */
@JacksonXmlRootElement( localName = "jobParameters", namespace = DxfNamespaces.DXF_2_0 )
@JsonDeserialize( using = AnalyticsJobParametersDeserializer.class )
public class AnalyticsJobParameters
    implements JobParameters
{
    private static final long serialVersionUID = 4613054056442242637L;

    private Integer lastYears = 0;

    private Set<AnalyticsTableType> skipTableTypes = new HashSet<>();

    private boolean skipResourceTables = false;

    public AnalyticsJobParameters()
    {
    }

    public AnalyticsJobParameters( Integer lastYears, Set<AnalyticsTableType> skipTableTypes, boolean skipResourceTables )
    {
        this.lastYears = lastYears;
        this.skipTableTypes = skipTableTypes;
        this.skipResourceTables = skipResourceTables;
    }

    @JsonProperty
    @JacksonXmlProperty( namespace = DxfNamespaces.DXF_2_0 )
    public Integer getLastYears()
    {
        return lastYears;
    }

    public void setLastYears( Integer lastYears )
    {
        this.lastYears = lastYears;
    }

    @JsonProperty
    @JacksonXmlElementWrapper( localName = "skipTableTypes", namespace = DxfNamespaces.DXF_2_0 )
    @JacksonXmlProperty( localName = "skipTableType", namespace = DxfNamespaces.DXF_2_0 )
    public Set<AnalyticsTableType> getSkipTableTypes()
    {
        return skipTableTypes;
    }

    public void setSkipTableTypes( Set<AnalyticsTableType> skipTableTypes )
    {
        this.skipTableTypes = skipTableTypes;
    }

    @JsonProperty
    @JacksonXmlProperty( namespace = DxfNamespaces.DXF_2_0 )
    public boolean isSkipResourceTables()
    {
        return skipResourceTables;
    }

    public void setSkipResourceTables( boolean skipResourceTables )
    {
        this.skipResourceTables = skipResourceTables;
    }

    @Override
    public Optional<ErrorReport> validate()
    {
        return Optional.empty();
    }
}
