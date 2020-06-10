package org.hisp.dhis.user;

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

import java.util.Set;

import org.hisp.dhis.common.IdentifiableObjectManager;
import org.hisp.dhis.system.deletion.DeletionHandler;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import static com.google.common.base.Preconditions.checkNotNull;

/**
 * @author Lars Helge Overland
 */
@Component( "org.hisp.dhis.user.UserGroupDeletionHandler" )
public class UserGroupDeletionHandler
    extends DeletionHandler
{
    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    private final IdentifiableObjectManager idObjectManager;

    private final JdbcTemplate jdbcTemplate;

    public UserGroupDeletionHandler( IdentifiableObjectManager idObjectManager, JdbcTemplate jdbcTemplate )
    {
        checkNotNull( idObjectManager );
        checkNotNull( jdbcTemplate );

        this.idObjectManager = idObjectManager;
        this.jdbcTemplate = jdbcTemplate;
    }

    // -------------------------------------------------------------------------
    // DeletionHandler implementation
    // -------------------------------------------------------------------------

    @Override
    protected String getClassName()
    {
        return UserGroup.class.getSimpleName();
    }

    @Override
    public void deleteUser( User user )
    {
        Set<UserGroup> userGroups = user.getGroups();
        
        for ( UserGroup group : userGroups )
        {
            group.getMembers().remove( user );
            idObjectManager.updateNoAcl( group );
        }
    }
    
    @Override
    public String allowDeleteUserGroup( UserGroup group )
    {
        int count = jdbcTemplate.queryForObject( "select count(*) from usergroupaccess where usergroupid=" + group.getId(), Integer.class );
        
        return count == 0 ? null : "";
    }

    @Override
    public void deleteUserGroup( UserGroup userGroup )
    {
        Set<UserGroup> userGroups = userGroup.getManagedByGroups();
        
        for ( UserGroup group : userGroups )
        {
            group.getManagedGroups().remove( userGroup );
            idObjectManager.updateNoAcl( group );
        }
    }
}
