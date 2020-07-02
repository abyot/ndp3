
/* global dhis2, angular, selection, i18n_ajax_login_failed, _ */

dhis2.util.namespace('dhis2.ndp');

// whether current user has any organisation units
dhis2.ndp.emptyOrganisationUnits = false;

dhis2.ndp.apiUrl = '../api';

var i18n_no_orgunits = 'No organisation unit attached to current user, no data entry possible';
var i18n_offline_notification = 'You are offline';
var i18n_online_notification = 'You are online';
var i18n_ajax_login_failed = 'Login failed, check your username and password and try again';

var optionSetsInPromise = [];
var attributesInPromise = [];
var batchSize = 50;

dhis2.ndp.store = null;
dhis2.ndp.metaDataCached = dhis2.ndp.metaDataCached || false;
dhis2.ndp.memoryOnly = $('html').hasClass('ie7') || $('html').hasClass('ie8');
var adapters = [];    
if( dhis2.ndp.memoryOnly ) {
    adapters = [ dhis2.storage.InMemoryAdapter ];
} else {
    adapters = [ dhis2.storage.IndexedDBAdapter, dhis2.storage.DomLocalStorageAdapter, dhis2.storage.InMemoryAdapter ];
}

dhis2.ndp.store = new dhis2.storage.Store({
    name: 'dhis2ndp',
    adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
    objectStores: ['dataElements', 'dataElementGroups', 'dataElementGroupSets', 'dataSets', 'optionSets', 'categoryCombos', 'attributes', 'ouLevels']
});

(function($) {
    $.safeEach = function(arr, fn)
    {
        if (arr)
        {
            $.each(arr, fn);
        }
    };
})(jQuery);

/**
 * Page init. The order of events is:
 *
 * 1. Load ouwt 
 * 2. Load meta-data (and notify ouwt) 
 * 
 */
$(document).ready(function()
{
    $.ajaxSetup({
        type: 'POST',
        cache: false
    });

    $('#loaderSpan').show();
});

$(document).bind('dhis2.online', function(event, loggedIn)
{
    if (loggedIn)
    {
        if (dhis2.ndp.emptyOrganisationUnits) {
            setHeaderMessage(i18n_no_orgunits);
        }
        else {
            setHeaderDelayMessage(i18n_online_notification);
        }
    }
    else
    {
        var form = [
            '<form style="display:inline;">',
            '<label for="username">Username</label>',
            '<input name="username" id="username" type="text" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<label for="password">Password</label>',
            '<input name="password" id="password" type="password" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<button id="login_button" type="button">Login</button>',
            '</form>'
        ].join('');

        setHeaderMessage(form);
        ajax_login();
    }
});

$(document).bind('dhis2.offline', function()
{
    if (dhis2.ndp.emptyOrganisationUnits) {
        setHeaderMessage(i18n_no_orgunits);
    }
    else {
        setHeaderMessage(i18n_offline_notification);
    }
});

function ajax_login()
{
    $('#login_button').bind('click', function()
    {
        var username = $('#username').val();
        var password = $('#password').val();

        $.post('../dhis-web-commons-security/login.action', {
            'j_username': username,
            'j_password': password
        }).success(function()
        {
            var ret = dhis2.availability.syncCheckAvailability();

            if (!ret)
            {
                alert(i18n_ajax_login_failed);
            }
        });
    });
}

// -----------------------------------------------------------------------------
// Metadata downloading
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Metadata downloading
// -----------------------------------------------------------------------------

/*function downloadMetaData()
{
    console.log('Loading required meta-data');
    var def = $.Deferred();
    var promise = def.promise();

    promise = promise.then( dhis2.ndp.store.open );
    promise = promise.then( getUserAccessibleDataSets );
    promise = promise.then( getOrgUnitLevels );
    promise = promise.then( getSystemSetting );
    
    //fetch data elements
    promise = promise.then( getMetaDataElements );
    promise = promise.then( filterMissingDataElements );
    promise = promise.then( getDataElements );
    
    //fetch data element groups
    promise = promise.then( getMetaDataElementGroups );
    promise = promise.then( filterMissingDataElementGroups );
    promise = promise.then( getDataElementGroups );
    
    //fetch data element groupsets
    promise = promise.then( getMetaDataElementGroupSets );
    promise = promise.then( filterMissingDataElementGroupSets );
    promise = promise.then( getDataElementGroupSets );
        
    //fetch data sets
    promise = promise.then( getMetaDataSets );
    promise = promise.then( filterMissingDataSets );
    promise = promise.then( getDataSets );
    
    //fetch option sets
    promise = promise.then( getMetaOptionSets );
    promise = promise.then( filterMissingOptionSets );
    promise = promise.then( getOptionSets );
        
    //fetch indicator groups
    promise = promise.then( getMetaCategoryCombos );
    promise = promise.then( filterMissingCategoryCombos );
    promise = promise.then( getCategoryCombos );
    
    promise.done(function() {        
        dhis2.tc.metaDataCached = true;
        dhis2.availability.startAvailabilityCheck();
        console.log( 'Finished loading meta-data' );
    });

    def.resolve();    
}*/

dhis2.ndp.downloadMetaData = function()
{
    console.log('Loading required meta-data');
    
    return dhis2.ndp.store.open()
    
        .then( getUserAccessibleDataSets )
        .then( getOrgUnitLevels )
        .then( getSystemSetting )

        //fetch data elements
        .then( getMetaDataElements )
        .then( filterMissingDataElements )
        .then( getDataElements )

        //fetch data element groups
        .then( getMetaDataElementGroups )
        .then( filterMissingDataElementGroups )
        .then( getDataElementGroups )

        //fetch data element groupsets
        .then( getMetaDataElementGroupSets )
        .then( filterMissingDataElementGroupSets )
        .then( getDataElementGroupSets )

        //fetch data sets
        .then( getMetaDataSets )
        .then( filterMissingDataSets )
        .then( getDataSets )

        //fetch option sets
        .then( getMetaOptionSets )
        .then( filterMissingOptionSets )
        .then( getOptionSets )

        //fetch category combos
        .then( getMetaCategoryCombos )
        .then( filterMissingCategoryCombos )
        .then( getCategoryCombos )

        //fetch custom attributes
        .then( getMetaAttributes )
        .then( filterMissingAttributes )
        .then( getAttributes );
};

function getUserAccessibleDataSets(){
    return dhis2.metadata.getMetaObject(null, 'ACCESSIBLE_DATASETS', dhis2.ndp.apiUrl + '/dataSets.json', 'fields=id,access[data[write]]&paging=false', 'sessionStorage', dhis2.ndp.store);
}

function getOrgUnitLevels()
{
    dhis2.ndp.store.getKeys( 'ouLevels').done(function(res){
        if(res.length > 0){
            return;
        }        
        return dhis2.metadata.getMetaObjects('ouLevels', 'organisationUnitLevels', dhis2.ndp.apiUrl + '/organisationUnitLevels.json', 'fields=id,displayName,level&paging=false', 'idb', dhis2.ndp.store);
    });
}

function getSystemSetting(){   
    if(localStorage['SYSTEM_SETTING']){
       return; 
    }    
    return dhis2.metadata.getMetaObject(null, 'SYSTEM_SETTING', dhis2.ndp.apiUrl + '/systemSettings?key=keyUiLocale&key=keyCalendar&key=keyDateFormat&key=multiOrganisationUnitForms', '', 'localStorage', dhis2.ndp.store);
}

function getMetaCategoryCombos(){
    return dhis2.metadata.getMetaObjectIds('categoryCombos', dhis2.ndp.apiUrl + '/categoryCombos.json', 'paging=false&fields=id,version');
}

function filterMissingCategoryCombos( objs ){
    return dhis2.metadata.filterMissingObjIds('categoryCombos', dhis2.ndp.store, objs);
}

function getCategoryCombos( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'categoryCombos', 'categoryCombos', dhis2.ndp.apiUrl + '/categoryCombos.json', 'paging=false&fields=id,displayName,code,skipTotal,isDefault,categoryOptionCombos[id,displayName,categoryOptions[displayName]],categories[id,displayName,code,dimension,dataDimensionType,attributeValues[value,attribute[id,name,valueType,code]],categoryOptions[id,displayName,code]]', 'idb', dhis2.ndp.store);
}

function getMetaDataElements(){
    return dhis2.metadata.getMetaObjectIds('dataElements', dhis2.ndp.apiUrl + '/dataElements.json', 'paging=false&fields=id,version');
}

function filterMissingDataElements( objs ){
    return dhis2.metadata.filterMissingObjIds('dataElements', dhis2.ndp.store, objs);
}

function getDataElements( ids ){
    return dhis2.metadata.getBatches( ids, batchSize, 'dataElements', 'dataElements', dhis2.ndp.apiUrl + '/dataElements.json', 'paging=false&fields=id,code,displayName,shortName,description,formName,valueType,optionSetValue,optionSet[id],attributeValues[value,attribute[id,name,valueType,code]],categoryCombo[id]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}

function getMetaDataElementGroups(){
    return dhis2.metadata.getMetaObjectIds('dataElementGroups', dhis2.ndp.apiUrl + '/dataElementGroups.json', 'paging=false&fields=id,version');
}

function filterMissingDataElementGroups( objs ){
    return dhis2.metadata.filterMissingObjIds('dataElementGroups', dhis2.ndp.store, objs);
}

function getDataElementGroups( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'dataElementGroups', 'dataElementGroups', dhis2.ndp.apiUrl + '/dataElementGroups.json', 'paging=false&fields=id,displayName,code,description,dataElements[id],attributeValues[value,attribute[id,name,valueType,code]]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}

function getMetaDataElementGroupSets(){
    return dhis2.metadata.getMetaObjectIds('dataElementGroupSets', dhis2.ndp.apiUrl + '/dataElementGroupSets.json', 'paging=false&fields=id,version');
}

function filterMissingDataElementGroupSets( objs ){
    return dhis2.metadata.filterMissingObjIds('dataElementGroupSets', dhis2.ndp.store, objs);
}

function getDataElementGroupSets( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'dataElementGroupSets', 'dataElementGroupSets', dhis2.ndp.apiUrl + '/dataElementGroupSets.json', 'paging=false&fields=id,code,description,displayName,dataElementGroups[id,displayName],attributeValues[value,attribute[id,name,valueType,code]]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}

function getMetaDataSets(){
    return dhis2.metadata.getMetaObjectIds('dataSets', dhis2.ndp.apiUrl + '/dataSets.json', 'paging=false&fields=id,version');
}

function filterMissingDataSets( objs ){
    return dhis2.metadata.filterMissingObjIds('dataSets', dhis2.ndp.store, objs);
}

function getDataSets( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'dataSets', 'dataSets', dhis2.ndp.apiUrl + '/dataSets.json', 'paging=false&fields=id,periodType,openFuturePeriods,displayName,version,categoryCombo[id],attributeValues[value,attribute[id,name,valueType,code]],organisationUnits[code,level],dataSetElements[id,dataElement[id]]', 'idb', dhis2.ndp.store, '');
}

function getMetaOptionSets(){
    return dhis2.metadata.getMetaObjectIds('optionSets', dhis2.ndp.apiUrl + '/optionSets.json', 'paging=false&fields=id,version');
}

function filterMissingOptionSets( objs ){
    return dhis2.metadata.filterMissingObjIds('optionSets', dhis2.ndp.store, objs);
}

function getOptionSets( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'optionSets', 'optionSets', dhis2.ndp.apiUrl + '/optionSets.json', 'paging=false&fields=id,displayName,code,version,valueType,attributeValues[value,attribute[id,name,valueType,code]],options[id,displayName,code]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}

function getMetaIndicatorGroups(){
    return dhis2.metadata.getMetaObjectIds('indicatorGroups', dhis2.ndp.apiUrl + '/indicatorGroups.json', 'paging=false&fields=id,version');
}

function filterMissingIndicatorGroups( objs ){
    return dhis2.metadata.filterMissingObjIds('indicatorGroups', dhis2.ndp.store, objs);
}

function getIndicatorGroups( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'indicatorGroups', 'indicatorGroups', dhis2.ndp.apiUrl + '/indicatorGroups.json', 'paging=false&fields=id,displayName,attributeValues[value,attribute[id,name,valueType,code]],indicators[id,displayName,denominatorDescription,numeratorDescription,dimensionItem,numerator,denominator,annualized,dimensionType,indicatorType[id,displayName,factor,number]]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}

function getMetaAttributes(){
    return dhis2.metadata.getMetaObjectIds('attributes', dhis2.ndp.apiUrl + '/attributes.json', 'paging=false&fields=id,version');
}

function filterMissingAttributes( objs ){
    return dhis2.metadata.filterMissingObjIds('attributes', dhis2.ndp.store, objs);
}

function getAttributes( ids ){    
    return dhis2.metadata.getBatches( ids, batchSize, 'attributes', 'attributes', dhis2.ndp.apiUrl + '/attributes.json', 'paging=false&fields=:all,!access,!lastUpdatedBy,!lastUpdated,!created,!href,!user,!translations,!favorites,optionSet[id,displayName,code,options[id,displayName,code,sortOrder]]', 'idb', dhis2.ndp.store, dhis2.metadata.processObject);
}