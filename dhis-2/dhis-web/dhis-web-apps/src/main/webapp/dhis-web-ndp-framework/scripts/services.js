/* global angular, moment, dhis2, parseFloat */

'use strict';

/* Services */

var ndpFrameworkServices = angular.module('ndpFrameworkServices', ['ngResource'])

.factory('DDStorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2ndp",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['dataElements', 'dataElementGroups', 'dataElementGroupSets', 'dataSets', 'optionSets', 'categoryCombos', 'attributes', 'ouLevels', 'programs']
    });
    return{
        currentStore: store
    };
})

/* Context menu for grid*/
.service('SelectedMenuService', function () {
    this.selectedMenu = null;

    this.setSelectedMenu = function (selectedMenu) {
        this.selectedMenu = selectedMenu;
    };

    this.getSelectedMenu= function () {
        return this.selectedMenu;
    };
})

.service('PeriodService', function(CalendarService, orderByFilter){

    this.getPeriods = function(periodType, periodOffset, futurePeriods){
        if(!periodType){
            return [];
        }

        var calendarSetting = CalendarService.getSetting();

        dhis2.period.format = calendarSetting.keyDateFormat;

        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );

        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );

        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );

        var d2Periods = dhis2.period.generator.generateReversedPeriods( periodType, periodOffset );

        d2Periods = dhis2.period.generator.filterOpenPeriods( periodType, d2Periods, futurePeriods, null, null );

        angular.forEach(d2Periods, function(p){
            //p.endDate = DateUtils.formatFromApiToUser(p.endDate);
            //p.startDate = DateUtils.formatFromApiToUser(p.startDate);
            p.displayName = p.name;
            p.id = p.iso;
        });

        return d2Periods;
    };

    this.getBasePeriod = function( periodId, allPeriods ){
        var index = -1, basePeriod = null;
        if ( periodId && allPeriods && allPeriods.length > 0 ){
            allPeriods = orderByFilter( allPeriods, '-id').reverse();
            for( var i=0; i<allPeriods.length; i++){
                if( allPeriods[i].id === periodId ){
                    index = i;
                }
            }
            if( index > 0 ){
                basePeriod = allPeriods[index - 1];
            }
        }
        return {location: index, period: basePeriod};
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, DDStorageService) {
    return {
        getAll: function(){

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get('optionSets', uid).done(function(optionSet){
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });
            return def.promise;
        },
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})

/* Service to fetch option combos */
.factory('OptionComboService', function($q, $rootScope, DDStorageService) {
    return {
        getAll: function(){
            var def = $q.defer();
            var optionCombos = [];
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        optionCombos = optionCombos.concat( cc.categoryOptionCombos );
                    });
                    $rootScope.$apply(function(){
                        def.resolve(optionCombos);
                    });
                });
            });

            return def.promise;
        },
        getMappedOptionCombos: function(){
            var def = $q.defer();
            var optionCombos = [];
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        angular.forEach(cc.categoryOptionCombos, function(oco){
                            oco.categories = [];
                            angular.forEach(cc.categories, function(c){
                                oco.categories.push({id: c.id, displayName: c.displayName});
                            });
                            optionCombos[oco.id] = oco;
                        });
                    });
                    $rootScope.$apply(function(){
                        def.resolve(optionCombos);
                    });
                });
            });
            return def.promise;
        },
        getBtaDimensions: function(){
            var def = $q.defer();
            var dimension = {options: [], category: null};
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    var catFound = false;
                     for( var i=0; i<categoryCombos.length && !catFound; i++){
                        for( var j=0; j<categoryCombos[i].categories.length;j++){
                            if( categoryCombos[i].categories[j].btaDimension ){
                                catFound = true;
                                dimension.category = categoryCombos[i].categories[j].id;
                                dimension.options = categoryCombos[i].categories[j].categoryOptions;
                                break;
                            }
                        }
                    }
                    $rootScope.$apply(function(){
                        def.resolve(dimension);
                    });
                });
            });
            return def.promise;
        }
    };
})

/* Factory to fetch programs */
.factory('DataSetFactory', function($q, $rootScope, storage, DDStorageService, orderByFilter, CommonUtils) {

    return {
        getActionDataSets: function( ou ){
            var systemSetting = storage.get('SYSTEM_SETTING');
            var allowMultiOrgUnitEntry = systemSetting && systemSetting.multiOrganisationUnitForms ? systemSetting.multiOrganisationUnitForms : false;

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var multiDs = angular.copy(dss);
                    var dataSets = [];
                    var pushedDss = [];
                    var key = 'dataSetType';
                    angular.forEach(dss, function(ds){
                        ds[key] = ds[key] ? ds[key] : key;
                        ds[key] = ds[key].toLocaleLowerCase();
                        if( ds.id && CommonUtils.userHasWriteAccess(ds.id) && ds.organisationUnits.hasOwnProperty( ou.id ) && ds[key] === "action" ){
                            ds.entryMode = 'single';
                            dataSets.push(ds);
                        }
                    });

                    if( allowMultiOrgUnitEntry && ou.c && ou.c.length > 0 ){

                        angular.forEach(multiDs, function(ds){
                            ds[key] = ds[key] ? ds[key] : key;
                            ds[key] = ds[key].toLocaleLowerCase();
                            if( ds.id && CommonUtils.userHasWriteAccess(ds.id) ){
                                angular.forEach(ou.c, function(c){
                                    if( ds.organisationUnits.hasOwnProperty( c ) && pushedDss.indexOf( ds.id ) === -1 && ds[key] === "action" ){
                                        ds.entryMode = 'multiple';
                                        dataSets.push(ds);
                                        pushedDss.push( ds.id );
                                    }
                                });
                            }
                        });
                    }
                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        getTargetDataSets: function(){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if( ds.id && CommonUtils.userHasWriteAccess(ds.id) && ds.dataSetType && ds.dataSetType === 'targetGroup'){
                            dataSets.push(ds);
                        }
                    });

                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        getActionAndTargetDataSets: function(){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if( ds.id && CommonUtils.userHasWriteAccess(ds.id) && ds.dataSetType && ( ds.dataSetType === 'targetGroup' || ds.dataSetType === 'action') ){
                            dataSets.push(ds);
                        }
                    });

                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        get: function(uid){

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get('dataSets', uid).done(function(ds){
                    $rootScope.$apply(function(){
                        def.resolve(ds);
                    });
                });
            });
            return def.promise;
        },
        getByOu: function(ou, selectedDataSet){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if(ds.organisationUnits.hasOwnProperty( ou.id ) && ds.id && CommonUtils.userHasWriteAccess(ds.id)){
                            dataSets.push(ds);
                        }
                    });

                    dataSets = orderByFilter(dataSets, '-displayName').reverse();

                    if(dataSets.length === 0){
                        selectedDataSet = null;
                    }
                    else if(dataSets.length === 1){
                        selectedDataSet = dataSets[0];
                    }
                    else{
                        if(selectedDataSet){
                            var continueLoop = true;
                            for(var i=0; i<dataSets.length && continueLoop; i++){
                                if(dataSets[i].id === selectedDataSet.id){
                                    selectedDataSet = dataSets[i];
                                    continueLoop = false;
                                }
                            }
                            if(continueLoop){
                                selectedDataSet = null;
                            }
                        }
                    }

                    if(!selectedDataSet || angular.isUndefined(selectedDataSet) && dataSets.legth > 0){
                        selectedDataSet = dataSets[0];
                    }

                    $rootScope.$apply(function(){
                        def.resolve({dataSets: dataSets, selectedDataSet: selectedDataSet});
                    });
                });
            });
            return def.promise;
        }
    };
})

/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, DDStorageService, orderByFilter) {

    return {
        get: function(store, uid){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get(store, uid).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        set: function(store, obj){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.set(store, obj).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll(store).done(function(objs){
                    objs = orderByFilter(objs, '-displayName').reverse();
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });
            });
            return def.promise;
        },
        getByProperty: function(store, prop, val){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll(store).done(function(objs){
                    var selectedObject = null;
                    for(var i=0; i<objs.length; i++){
                        if(objs[i][prop] ){
                            objs[i][prop] = objs[i][prop].toLocaleLowerCase();
                            if( objs[i][prop] === val )
                            {
                                selectedObject = objs[i];
                                break;
                            }
                        }
                    }

                    $rootScope.$apply(function(){
                        def.resolve(selectedObject);
                    });
                });
            });
            return def.promise;
        },
        getDataElementGroups: function(){
            var def = $q.defer();
            var dataElementsById = {}, categoryCombosById = {};
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        categoryCombosById[cc.id] = cc;
                    });

                    DDStorageService.currentStore.getAll('dataElements').done(function(dataElements){
                        angular.forEach(dataElements, function(de){
                            var cc = categoryCombosById[de.categoryCombo.id];
                            de.categoryOptionCombos = cc.categoryOptionCombos;
                            dataElementsById[de.id] = de;
                        });

                        DDStorageService.currentStore.getAll('dataElementGroups').done(function(dataElementGroups){
                            angular.forEach(dataElementGroups, function(deg){
                                angular.forEach(deg.dataElements, function(de){
                                    var _de = dataElementsById[de.id];
                                    de.categoryOptionCombos = _de.categoryOptionCombos ? _de.categoryOptionCombos : [];
                                    de.displayName = _de.displayName;
                                });

                                deg.dataElements = orderByFilter(deg.dataElements, '-displayName').reverse();
                            });
                            $rootScope.$apply(function(){
                               def.resolve(dataElementGroups);
                            });
                        });
                    });
                });

            });
            return def.promise;
        }
    };
})

.service('OrgUnitGroupSetService', function($http, CommonUtils){
    return {
        getSectors: function(){
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + filter;
            var promise = $http.get( url ).then(function(response){
                var sectors = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'sector' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                sectors.push( og );
                            });
                        }
                    });
                }
                return sectors;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getMdas: function(){
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + filter;
            var promise = $http.get( url ).then(function(response){
                var mdas = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'mdalg' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                og = dhis2.metadata.processMetaDataAttribute( og );
                                if( og.orgUnitGroupType && og.orgUnitGroupType === 'mda' && og.organisationUnits){
                                    angular.forEach(og.organisationUnits, function(ou){
                                        mdas.push( ou.id );
                                    });
                                }
                            });
                        }
                    });
                }
                return mdas;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getLgs: function(){
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + filter;
            var promise = $http.get( url ).then(function(response){
                var lgs = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'mdalg' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                og = dhis2.metadata.processMetaDataAttribute( og );
                                if( og.orgUnitGroupType && og.orgUnitGroupType === 'lg' && og.organisationUnits){
                                    angular.forEach(og.organisationUnits, function(ou){
                                        lgs.push( ou.id );
                                    });
                                }
                            });
                        }
                    });
                }
                return lgs;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getByVote: function( id ){
            var filter = '?paging=false&fields=id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnits/' + id + '.json' + filter;
            var promise = $http.get( url ).then(function(response){
                return response.data;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
})

.service('Analytics', function($http, $filter, $translate, PeriodService, orderByFilter, CommonUtils, NotificationService){
    return {
        getData: function( url ){
            url = dhis2.ndp.apiUrl + '/analytics?' + url;
            var promise = $http.get( url ).then(function(response){

                var data = response.data;
                var reportData = [];
                if ( data && data.headers && data.headers.length > 0 && data.rows && data.rows.length > 0 ){
                    for(var i=0; i<data.rows.length; i++){
                        var r = {}, d = data.rows[i];
                        for(var j=0; j<data.headers.length; j++){

                            if ( data.headers[j].name === 'numerator' || data.headers[j].name === 'denominator' ){
                                d[j] = parseInt( d[j] );
                            }
                            else if( data.headers[j].name === 'value' ){
                                d[j] = parseFloat( d[j] );
                            }

                            r[data.headers[j].name] = d[j];
                        }

                        delete r.multiplier;
                        delete r.factor;
                        delete r.divisor;
                        reportData.push( r );
                    }
                }
                return {data: reportData, metaData: data.metaData};
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        processData: function( dataParams ){

            var keyDataParams = ['data', 'metaData', 'reportPeriods', 'bta', 'selectedDataElementGroupSets', 'dataElementGroups'];

            if( !dataParams ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_report_parameters"));
                return;
            }

            for(var i=0; i<keyDataParams.length; i++){
                if( !dataParams[keyDataParams[i]] ){
                    NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_report_parameters") + ' - ' + keyDataParams[i] );
                    return;
                }
            }

            var btaDimensions = {category: dataParams.bta.category};
            angular.forEach(dataParams.bta.options, function(op){
               btaDimensions[op.id] = op.btaDimensionType;
            });

            var reportPeriods = orderByFilter( dataParams.reportPeriods, '-id').reverse();
            var data = dataParams.data;
            var baseLineTargetActualDimensions = $.map(dataParams.bta.options, function(d){return d.id;});
            var dataExists = false;
            var dataHeaders = [];
            var performanceHeaders = orderByFilter( dataParams.reportPeriods, '-id').reverse();
            var resultData = [];
            var performanceData = [];

            var mergeBtaData = function( _data ){
                var data = angular.copy( _data );
                var res = {};
                if ( data && data.length && data.length > 0 ){
                    angular.forEach(data, function(r){
                        for( var k in r ){
                            if ( k === btaDimensions.category ){
                                var dim = btaDimensions[r[k]];
                                r[dim] = r.value;
                                delete r.value;
                                break;
                            }
                        }
                        res = Object.assign( res, r );
                    });
                }
                return res;
            };

            var getBaseData = function( current, data ){
                var base = null;
                var c = angular.copy( current );
                delete c.target; delete c.actual; delete c.baseline; delete c[btaDimensions.category];
                if ( current && current.pe && data ){
                    var currentBasePeriod = PeriodService.getBasePeriod( current.pe, dataParams.allPeriods );
                    if( currentBasePeriod && currentBasePeriod.period && currentBasePeriod.period.id ){
                        c.pe = currentBasePeriod.period.id;
                        var _d = $filter('dataFilter')(data, c);
                        base = mergeBtaData( _d, data );

                        return base;
                    }
                }

                return base;
            };

            var filterResultData = function(header, dataElement, oc, data, reportParams){
                if(!header || !data || !header.periodId || !header.dimensionId || !dataElement) return;

                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId,
                    co: oc
                };

                filterParams[reportParams.bta.category] = header.dimensionId;
                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? res.value : '';
            };

            var filterPerformanceData = function(header, dataElement, oc, data, reportParams){
                if(!header || !data || !header.id || !dataElement) return;

                var filterParams = {
                    dx: dataElement,
                    pe: header.id,
                    co: oc
                };

                var rs = $filter('dataFilter')(data, filterParams);
                var currentData = mergeBtaData( rs );
                var baseData = getBaseData( currentData, data );

                if ( baseData ){
                    return CommonUtils.getPercent( currentData.actual - baseData.actual, currentData.target - baseData.actual );
                }
                else{
                    return $translate.instant("no_target");
                }
            };

            angular.forEach(reportPeriods, function(pe){
                var colSpan = 0;
                var d = $filter('filter')(data, {pe: pe.id});
                pe.hasData = d && d.length > 0;
                angular.forEach(baseLineTargetActualDimensions, function(dm){
                    var filterParams = {pe: pe.id};
                    filterParams[dataParams.bta.category] = dm;
                    var d = $filter('dataFilter')(data, filterParams);
                    if( d && d.length > 0 ){
                        colSpan++;
                        dataHeaders.push({periodId: pe.id, dimensionId: dm, dimension: dataParams.bta.category});
                    }
                });
                pe.colSpan = colSpan;
            });

            if( Object.keys( data ).length === 0 ){
                dataExists = false;
                return;
            }
            else{
                dataExists = true;
                resultData = [];
                performanceData = [];
                var resultRow = [], parsedResultRow = [], performanceRow = [], parsedPerformanceRow = [];

                angular.forEach(dataParams.selectedDataElementGroupSets, function(degs){
                    var groupSet = {val: degs.displayName, span: 0};
                    resultRow.push(groupSet);
                    performanceRow.push(groupSet);

                    var generateRow = function(group, deg){
                        if( deg && deg.dataElements ){
                            angular.forEach(deg.dataElements, function(de){
                                angular.forEach(de.categoryOptionCombos, function(oc){
                                    groupSet.span++;
                                    group.span++;

                                    var name = dataParams.metaData.items[de.id].name;
                                    if( de.categoryOptionCombos.length > 1 ){
                                        name = name + " - " + oc.displayName;
                                    }

                                    //Result data
                                    resultRow.push({val: name , span: 1, info: de.id});
                                    angular.forEach(dataHeaders, function(dh){
                                        resultRow.push({val: filterResultData(dh, de.id, oc.id, data, dataParams), span: 1});
                                    });
                                    parsedResultRow.push(resultRow);
                                    resultRow = [];

                                    //Performance data
                                    performanceRow.push({val: name , span: 1, info: de.id});
                                    angular.forEach(performanceHeaders, function(dh){
                                        performanceRow.push({val: filterPerformanceData(dh, de.id, oc.id, data, dataParams), span: 1});
                                    });
                                    parsedPerformanceRow.push(performanceRow);
                                    performanceRow = [];
                                });
                            });
                        }
                    };

                    angular.forEach(degs.dataElementGroups, function(deg){
                        if( dataParams.selectedDataElementGroup && dataParams.selectedDataElementGroup.id ){
                            if ( deg.id === dataParams.selectedDataElementGroup.id ){
                                var group = {val: deg.displayName, span: 0};
                                resultRow.push(group);
                                performanceRow.push(group);
                                var _deg = $filter('filter')(dataParams.dataElementGroups, {id: deg.id})[0];
                                generateRow(group, _deg);
                            }
                        }
                        else{
                            var group = {val: deg.displayName, span: 0};
                            resultRow.push(group);
                            performanceRow.push(group);
                            var _deg = $filter('filter')(dataParams.dataElementGroups, {id: deg.id})[0];
                            generateRow(group, _deg);
                        }
                    });
                });
                resultData = parsedResultRow;
                performanceData = parsedPerformanceRow;
            }

            return {
                performanceData: performanceData,
                resultData: resultData,
                dataExists: dataExists,
                dataHeaders: dataHeaders,
                reportPeriods: reportPeriods
            };
        }
    };
})

.service('EventService', function($http, $q, DHIS2URL, CommonUtils, DateUtils, FileService, OptionSetService) {

    var bytesToSize = function ( bytes ){
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    var skipPaging = "&skipPaging=true";

    var getByOrgUnitAndProgram = function(orgUnit, ouMode, program, typeDataElement, fileDataElement, optionSets, dataElementById){
        var url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + skipPaging;
        var promise = $http.get( url ).then(function(response){
            var events = response.data && response.data.events ? response.data.events : [];
            var documents = [];
            if( response && response.data && response.data.events ){
                angular.forEach(events, function(ev){
                    var doc = {
                        dateUploaded: DateUtils.formatFromApiToUser(ev.eventDate),
                        uploadedBy: ev.storedBy,
                        event: ev.event
                    };

                    if( ev.dataValues ){
                        angular.forEach(ev.dataValues, function(dv){
                            if( dv.dataElement === typeDataElement.id ){
                                doc.folder = dv.value;
                            }
                            else if( dv.dataElement === fileDataElement.id ){
                                doc.value = dv.value;
                                FileService.get( dv.value ).then(function(res){
                                    doc.name = res.displayName || '';
                                    doc.size = bytesToSize( res.contentLength || 0 );
                                    doc.type = res.contentType || 'undefined';
                                    doc.path = '/events/files?dataElementUid=' + dv.dataElement + '&eventUid=' + ev.event;
                                });
                            }
                            else{
                                var val = dv.value;
                                var de = dataElementById[dv.dataElement];

                                if( de && de.optionSetValue ){
                                    val = OptionSetService.getName(optionSets[de.optionSet.id].options, String(val));
                                }

                                doc[dv.dataElement] = val;
                            }
                        });
                    }
                    documents.push( doc );
                });
            }
            return documents;

        }, function(response){
            CommonUtils.errorNotifier(response);
        });

        return promise;
    };

    var get = function(eventUid){
        var promise = $http.get(DHIS2URL + '/events/' + eventUid + '.json').then(function(response){
            return response.data;
        });
        return promise;
    };

    var create = function(dhis2Event){
        var promise = $http.post(DHIS2URL + '/events.json', dhis2Event).then(function(response){
            return response.data;
        });
        return promise;
    };

    var deleteEvent = function(dhis2Event){
        var promise = $http.delete(DHIS2URL + '/events/' + dhis2Event.event).then(function(response){
            return response.data;
        });
        return promise;
    };

    var update = function(dhis2Event){
        var promise = $http.put(DHIS2URL + '/events/' + dhis2Event.event, dhis2Event).then(function(response){
            return response.data;
        });
        return promise;
    };
    return {
        get: get,
        create: create,
        deleteEvent: deleteEvent,
        update: update,
        getByOrgUnitAndProgram: getByOrgUnitAndProgram,
        getForMultipleOptionCombos: function( orgUnit, mode, pr, attributeCategoryUrl, optionCombos, startDate, endDate ){
            var def = $q.defer();
            var promises = [], events = [];
            angular.forEach(optionCombos, function(oco){
                promises.push( getByOrgUnitAndProgram( orgUnit, mode, pr, attributeCategoryUrl, oco.id, startDate, endDate) );
            });

            $q.all(promises).then(function( _events ){
                angular.forEach(_events, function(evs){
                    events = events.concat( evs );
                });

                def.resolve(events);
            });
            return def.promise;
        },
        getForMultiplePrograms: function( orgUnit, mode, programs, attributeCategoryUrl, startDate, endDate ){
            var def = $q.defer();
            var promises = [], events = [];
            angular.forEach(programs, function(pr){
                promises.push( getByOrgUnitAndProgram( orgUnit, mode, pr.id, attributeCategoryUrl, null, startDate, endDate) );
            });

            $q.all(promises).then(function( _events ){
                angular.forEach(_events, function(evs){
                    events = events.concat( evs );
                });

                def.resolve(events);
            });
            return def.promise;
        }
    };
})

.service('ProjectService', function($http, DateUtils, CommonUtils, OptionSetService){
    return {
        getByProgram: function(orgUnit, program, optionSets, attributesById){
            var url = dhis2.ndp.apiUrl + '/trackedEntityInstances.json?ouMode=DESCENDANTS&order=created:desc&paging=false&ou=' + orgUnit.id + '&program=' + program.id;
            var promise = $http.get( url ).then(function(response){
                var teis = response.data && response.data.trackedEntityInstances ? response.data.trackedEntityInstances : [];
                var projects = [];
                angular.forEach(teis, function(tei){
                    if( tei.attributes ){
                        var project = {
                            orgUnit: tei.orgUnit,
                            trackedEntityInstance: tei.trackedEntityInstance
                        };
                        angular.forEach(tei.attributes, function(att){
                            var val = att.value;
                            var attribute = attributesById[att.attribute];
                            if( attribute && attribute.optionSetValue ){
                                val = OptionSetService.getName(optionSets[attribute.optionSet.id].options, String(val));
                            }

                            project[att.attribute] = val;
                        });
                        projects.push( project );
                    }
                });

                return projects;
            }, function(response){
                CommonUtils.errorNotifier(response);
            });
            return promise;
        },
        get: function( project, optionSets, attributesById, dataElementsById ){
            var url = dhis2.ndp.apiUrl + '/trackedEntityInstances/' + project.trackedEntityInstance +'.json?fields=*';
            var promise = $http.get( url ).then(function(response){

                var tei = response.data;

                if( tei && tei.attributes ){
                    angular.forEach(tei.attributes, function(att){
                        var attribute = attributesById[att.attribute];
                        var val = att.value;
                        if( attribute ){
                            val = CommonUtils.formatDataValue(null, val, attribute, optionSets, 'USER');
                        }
                        att.value = val;
                    });
                }

                if( tei.enrollments ){
                    angular.forEach(tei.enrollments, function(en){
                        en.enrollmentDate = DateUtils.formatFromApiToUser(en.enrollmentDate);
                        angular.forEach(en.events, function(ev){
                            ev.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                            angular.forEach(ev.dataValues, function(dv){
                                var de = dataElementsById[dv.dataElement];
                                var val = dv.value;
                                if ( de ){
                                    val = CommonUtils.formatDataValue(ev, val, de, optionSets, 'USER');
                                }
                                ev[dv.dataElement] = val;
                            });
                        });
                    });
                }

                return tei;
            }, function(response){
                CommonUtils.errorNotifier(response);
            });
            return promise;
        }
    };
});