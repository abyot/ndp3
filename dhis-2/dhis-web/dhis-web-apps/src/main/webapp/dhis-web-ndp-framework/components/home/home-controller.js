/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $translate,
                $modal,
                $filter,
                orderByFilter,
                PeriodService,
                MetaDataFactory,
                Analytics) {
   
    $scope.model = {
        metaDataCached: false,
        data: null,
        dataElements: [],
        dataElementGroups: [],
        dataElementGroupSets: [],
        selectedDataElementGroups: [],
        selectedDataElementGroupSets: [],
        baseLineTargetActualDimensions: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSetsById: [],
        dictionaryItems: [],
        attributes: [],
        selectedPeriods: [],
        periods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        selectedDataElementGroup: null,
        selectedDictionary: null,
        dictionaryHeaders: {},
        ndp: null,
        ndpProgram: null,
        selectedNDP: null,
        selectedProgram: null
    };

    $scope.$watch('model.selectedDictionary', function(){
        if( angular.isObject($scope.model.selectedDictionary) && $scope.model.selectedDictionary.id){
            
        }
    });
    
    $scope.$watch('model.selectedNDP', function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.model.selectedDataElementGroup = null;
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedNDP) && $scope.model.selectedNDP.id && $scope.model.selectedNDP.code){
            console.log('the code:  ', $scope.model.selectedNDP.code);
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedNDP.code, indicatorGroupSetType: 'objective'}, true);
            console.log('the s degs:  ', $scope.model.selectedDataElementGroupSets);
        }
    });
    
    $scope.$watch('model.selectedDataElementGroupSet', function(){
        $scope.model.dataElementGroup = null;
        $scope.model.selectedDataElementGroup = null;
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedDataElementGroupSet) && $scope.model.selectedDataElementGroupSet.id){
            $scope.model.selectedDataElementGroup = null;
        }
    });
    
    $scope.$watch('model.selectedDataElementGroup', function(){
        $scope.model.dataElementGroup = null;
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedDataElementGroup) && $scope.model.selectedDataElementGroup.id){
            $scope.model.dataElementGroup = $filter('filter')($scope.model.dataElementGroups, {id: $scope.model.selectedDataElementGroup.id}, true)[0];            
        }
        $scope.getAnalyticsData();
    });
    
    $scope.$watch('model.selectedProgram', function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedProgram) && $scope.model.selectedProgram.id && $scope.model.selectedProgram.code){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndpProgramme: $scope.model.selectedProgram.code, indicatorGroupSetType: 'objective'});
        }
    });
    
    dhis2.ndp.downloadMetaData().then(function(){
        
        MetaDataFactory.getAll('attributes').then(function(attributes){
            
            $scope.model.attributes = attributes;
        
            MetaDataFactory.getAll('categoryCombos').then(function(categoryCombos){
                angular.forEach(categoryCombos, function(cc){
                    $scope.model.categoryCombosById[cc.id] = cc;
                });

                MetaDataFactory.getAll('optionSets').then(function(optionSets){
                    
                    $scope.model.ndp = $filter('filter')(optionSets, {code: 'ndp'})[0];
                    $scope.model.ndpProgram = $filter('filter')(optionSets, {code: 'ndpIIIProgram'})[0];


                    MetaDataFactory.getAll('dataSets').then(function(dataSets){

                        angular.forEach(dataSets, function(ds){
                            ds.dataElements = ds.dataElements.map(function(de){ return de.id; });
                            $scope.model.dataSetsById[ds.id] = ds;
                        });

                        $scope.model.dataSets = dataSets;

                        MetaDataFactory.getAll('dataElements').then(function(dataElements){

                            angular.forEach(dataElements, function(de){
                                var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;

                                for(var i=0; i<$scope.model.dataSets.length; i++){
                                    if( $scope.model.dataSets[i].dataElements.indexOf(de.id) !== -1 ){
                                        var ds = $scope.model.dataSets[i];
                                        de.periodType = ds.periodType  === 'FinancialJuly' ? 'Fiscal year' : ds.periodType;
                                        de.vote = ds.organisationUnits.length > 1 ? ds.organisationUnits[0].code + ' and others' : ds.organisationUnits[0].code;
                                        break;
                                    }
                                }
                            });

                            var item = {id: 'dataElements', name: $translate.instant('indicators')};
                            $scope.model.selectedDictionary = item;
                            $scope.model.dictionaryItems.push( item );
                            $scope.model.dataElements = dataElements;
                            $scope.sortHeader = {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false};
                            $scope.model.dictionaryHeaders['dataElements'] = [
                                {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false},
                                {id: 'code', name: 'code', colSize: "col-sm-1", show: true, fetch: false},
                                {id: 'disaggregation', name: 'disaggregation', colSize: "col-sm-1", show: true, fetch: false},
                                {id: 'valueType', name: 'valueType', colSize: "col-sm-1", show: true, fetch: false},
                                {id: 'periodType', name: 'frequency', colSize: "col-sm-1", show: true, fetch: false},
                                {id: 'vote', name: 'vote', colSize: 'col-sm-1', show: true, fetch: false}
                            ];
                            
                            angular.forEach($scope.model.attributes, function(att){
                                if(att['dataElementAttribute']){
                                    var header = {id: att.id, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
                                    $scope.model.dictionaryHeaders['dataElements'].push(header);
                                }
                            });

                            MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){

                                $scope.model.dictionaryHeaders['dataElementGroups'] = [
                                    {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false},                
                                    {id: 'code', name: '_code', colSize: "col-sm-1", show: true, fetch: false}
                                ];

                                angular.forEach($scope.model.attributes, function(att){
                                    if(att['dataElementGroupAttribute']){
                                        var header = {id: att.id, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
                                        $scope.model.dictionaryHeaders['dataElementGroups'].push(header);
                                    }
                                });

                                $scope.model.dictionaryItems.push({id: 'dataElementGroups', name: $translate.instant('outcomes_outputs')});
                                $scope.model.dataElementGroups = dataElementGroups;

                                MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){
                                    $scope.model.dictionaryHeaders['dataElementGroupSets'] = [
                                        {id: 'displayName', name: 'name', colSize: "col-sm-3", show: true, fetch: false},                
                                        {id: 'code', name: '_code', colSize: "col-sm-1", show: true, fetch: false}
                                    ];

                                    angular.forEach($scope.model.attributes, function(att){
                                        if(att['dataElementGroupSetAttribute']){
                                            var header = {id: att.id, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
                                            $scope.model.dictionaryHeaders['dataElementGroupSets'].push(header);
                                        }
                                    });
                                
                                    $scope.model.dictionaryItems.push({id: 'dataElementGroupSets', name: $translate.instant('goals_objectives_interventions')});
                                    $scope.model.dataElementGroupSets = dataElementGroupSets;

                                    $scope.model.metaDataCached = true;
                                    $scope.model.menuTitle = $translate.instant('menu_title');
                                    $scope.model.selectedMenu = 'NDP';
                                    
                                    $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
                                    
                                    var selectedPeriodNames = ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];
                                    
                                    angular.forEach($scope.model.periods, function(pe){
                                        if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                                           $scope.model.selectedPeriods.push(pe);
                                        } 
                                    });
                                    
                                    $scope.model.baseLineTargetActualDimensions = ['bqIaasqpTas', 'Px8Lqkxy2si', 'HKtncMjp06U'];
                                });
                            });
                        });
                    });
                });    
            });
        });    
    });
    
    $scope.getPeriods = function(mode){
        if( mode === 'NXT'){
            $scope.model.periodOffset = $scope.model.periodOffset + 1;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }
        else{
            $scope.model.periodOffset = $scope.model.periodOffset - 1;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }    
    };
    
    $scope.showCategoryDetail = function(){
        
    };
    
    $scope.sortItems = function(header){        
        $scope.reverse = ($scope.sortHeader && $scope.sortHeader.id === header.id) ? !$scope.reverse : false;
        $scope.sortHeader = header;       
    };
    
    $scope.getAnalyticsData = function(){
        
        $scope.model.data = null;
        var analyticsUrl = '';
        if( $scope.model.selectedDataElementGroup && $scope.model.dataElementGroup && $scope.model.selectedPeriods.length > 0){
            analyticsUrl += '&filter=ou:ONXWQ2EoOcP&displayProperty=NAME&includeMetadataDetails=true';
            analyticsUrl += '&dimension=Duw5yep8Vae:' + $.map($scope.model.baseLineTargetActualDimensions, function(dm){return dm;}).join(';');//$scope.model.baseLineTargetActualDimensions+ bqIaasqpTas;Px8Lqkxy2si;HKtncMjp06U';
            analyticsUrl += '&dimension=pe:' + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';');//['2017July','2020July','2021July','2022July','2023July','2014July'].join(';');
            analyticsUrl += '&dimension=dx:' + $.map($scope.model.dataElementGroup.dataElements, function(de){return de.id;}).join(';');
            
            Analytics.getData( analyticsUrl ).then(function(data){
                console.log('data:  ', data);
                $scope.model.selectedPeriods = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();
                $scope.model.data = data.data;
                $scope.model.metaData = data.metaData;
                $scope.model.reportReady = true;
                $scope.model.reportStarted = false;
                $scope.model.dataHeaders = [];
                angular.forEach($scope.model.selectedPeriods, function(pe){
                    var colSpan = 0;
                    angular.forEach($scope.model.baseLineTargetActualDimensions, function(dm){
                        var d = $filter('filter')($scope.model.data, {Duw5yep8Vae: dm, pe: pe.id});
                        if( d && d.length > 0 ){
                            colSpan++;
                            $scope.model.dataHeaders.push({periodId: pe.id, dimensionId: dm, dimension: 'Duw5yep8Vae'});
                        }
                    });                    
                    pe.colSpan = colSpan;
                });

                if( Object.keys( data ).length === 0 ){                    
                    $scope.model.dataExists = false;
                    return;
                }
                else{
                    $scope.model.dataExists = true;
                }
            });
        }        
    };
    
    $scope.filterData = function(header, dataElement){
        if(!header || !$scope.model.data || !header.periodId || !header.dimensionId || !dataElement) return;
        var res = $filter('filter')($scope.model.data, {dx: dataElement, Duw5yep8Vae: header.dimensionId, pe: header.periodId})[0];
        return res && res.value ? res.value : '';        
    };
    
    $scope.exportData = function () {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });
        
        var reportName = $scope.model.selectedDictionary.name + " .xls";
        
        saveAs(blob, reportName);
    };
    
    $scope.showDetails = function( item ){
        var modalInstance = $modal.open({
            templateUrl: 'views/details-modal.html',
            controller: 'DetailsController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id];
                },
                dictionaryItem: function(){
                    return item;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {            
            $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id] = gridColumns;           
        });
    };
    
    $scope.showHideColumns = function(){
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id];
                },
                hiddenGridColumns: function(){
                    return ($filter('filter')($scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id], {show: false})).length;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {            
            $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id] = gridColumns;           
        });
    };
    
    $scope.resetView = function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.model.selectedDataElementGroup = null;
        $scope.model.dataElementGroup = null;
        $scope.model.selectedNDP = null;
        $scope.model.selectedProgram = null;        
        $scope.resetDataView();
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };
});
