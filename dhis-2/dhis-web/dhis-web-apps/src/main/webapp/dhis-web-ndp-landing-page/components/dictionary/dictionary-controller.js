/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('DictionaryController',
        function($scope,
                $modal,
                $filter,
                $translate,
                NotificationService,
                SessionStorageService,
                MetaDataFactory) {

    $scope.model = {
        indicatorsFetched: false,
        data: null,
        dataElements: [],
        dataElementsById: [],
        dataElementGroups: [],
        dataElementGroupSets: [],
        selectedDataElementGroups: [],
        selectedDataElementGroupSets: [],
        classificationGroupSets: [],
        classificationGroups: [],
        classificationDataElements: [],
        baseLineTargetActualDimensions: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: [],
        dictionaryItems: [],
        attributes: [],
        selectedPeriodType: 'FinancialJuly',
        selectedDataElementGroup: null,
        selectedDictionary: null,
        dictionaryHeaders: [],
        ndp: null,
        ndpProgram: null,
        selectedNDP: null,
        selectedProgram: null,
        groupSetSize: {},
        financialPerformance: true,
        showProjectDetails: false,
        classificationGroup: null,
        completeness: {
            green: ['displayName', 'code', 'periodType', 'computationMethod', 'indicatorType', 'preferredDataSource', 'rationale', 'responsibilityForIndicator', 'unit'],
            yellow: ['displayName', 'code', 'accountabilityForIndicator', 'computationMethod', 'preferredDataSource', 'unit'],
            invalid: ['isProgrammeDocument', 'isDocumentFolder']
        }
    };

    $scope.model.horizontalMenus = [
        {id: 'default', title: 'ndp_indicator', order: 1, view: 'components/dictionary/default.html', active: true, class: 'main-horizontal-menu'},
        {id: 'classification', title: 'indicator_classification', order: 2, view: 'components/dictionary/classification.html', class: 'main-horizontal-menu'}
    ];

    $scope.getDataElementGroupSetsForNdp = function(){
        $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.dataElementGroupSets );
        if( angular.isObject($scope.model.selectedNDP) && $scope.model.selectedNDP.code){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedNDP.code}, true);
            $scope.model.ndpProgram = $filter('filter')($scope.model.optionSets, {ndp: $scope.model.selectedNDP.code, isNDPProgramme: true}, true)[0];
        }

        $scope.model.selectedDataElementGroups = [];

        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            angular.forEach(degs.dataElementGroups, function(deg){
                $scope.model.selectedDataElementGroups.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        });
    };

    $scope.getSelectedDataElementGroups = function(){
        $scope.model.dataElements = [];
        var available = [];
        angular.forEach($scope.model.selectedDataElementGroups, function(deg){
            angular.forEach(deg.dataElements, function(de){
                var _de = $scope.model.dataElementsById[de.id];
                if( _de && available.indexOf(de.id) === -1 ){
                    $scope.model.dataElements.push( _de );
                    available.push( de.id );
                }
            });
        });
    };

    $scope.getClassificationGroups = function(){
        $scope.model.classificationIndicatorsFetched = false;
        $scope.model.classificationDataElements = [];
        var available = [];
        $scope.model.classificationDataElements = [];
        angular.forEach($scope.model.classificationGroups, function(deg){
            angular.forEach(deg.dataElements, function(de){
                var _de = $scope.model.dataElementsById[de.id];
                if( _de && available.indexOf(de.id) === -1 ){
                    $scope.model.classificationDataElements.push( _de );
                    available.push( de.id );
                }
            });
        });
        $scope.model.classificationIndicatorsFetched = true;
    };

    $scope.$watch('model.selectedNDP', function(){
        $scope.model.selectedProgram = null;
        $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.dataElementGroupSets );
        $scope.model.selectedDataElementGroups = angular.copy( $scope.model.dataElementGroups );
        $scope.getDataElementGroupSetsForNdp();
        $scope.getSelectedDataElementGroups();
    });

    $scope.$watch('model.selectedProgram', function(){
        $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.dataElementGroupSets );
        $scope.model.selectedDataElementGroups = angular.copy( $scope.model.dataElementGroups );
        if( angular.isObject($scope.model.selectedProgram) && $scope.model.selectedProgram.code){
            $scope.model.selectedDataElementGroups = [];
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedNDP.code, ndpProgramme: $scope.model.selectedProgram.code}, true);

            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.selectedDataElementGroups.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }

        $scope.getSelectedDataElementGroups();
    });

    $scope.$watch('model.selectedClassification', function(){

        $scope.model.classificationGroups = angular.copy( $scope.model.dataElementGroups );

        if ( angular.isObject( $scope.model.selectedClassification ) && $scope.model.selectedClassification.id ){
            $scope.model.classificationGroups = [];
            var _deg = $filter('filter')($scope.model.dataElementGroups, {id: $scope.model.selectedClassification.id});
            if (_deg && _deg.length > 0){
                $scope.model.classificationGroups.push( _deg[0] );
            }
        }
        else{
            $scope.model.classificationGroups = [];
            $scope.model.classificationGroupSets = angular.copy( [$scope.model.classificationGroup] );
            if ( $scope.model.classificationGroup && $scope.model.classificationGroup.dataElementGroups ){
                angular.forEach($scope.model.classificationGroup.dataElementGroups, function(deg){
                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                    if (_deg && _deg.length > 0){
                        $scope.model.classificationGroups.push( _deg[0] );
                    }
                });
            }
        }
        $scope.getClassificationGroups();
    });

    dhis2.ndp.downloadAllMetaData().then(function(){

        SessionStorageService.set('ALL_METADATA_CACHED', true);

        MetaDataFactory.getAll('attributes').then(function(attributes){

            $scope.model.attributes = attributes;

            MetaDataFactory.getAll('categoryCombos').then(function(categoryCombos){
                angular.forEach(categoryCombos, function(cc){
                    $scope.model.categoryCombosById[cc.id] = cc;
                });

                MetaDataFactory.getAll('optionSets').then(function(optionSets){
                    $scope.model.optionSets = optionSets;
                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSetsById[optionSet.id] = optionSet;
                    });

                    $scope.model.ndp = $filter('getFirst')($scope.model.optionSets, {code: 'ndp'});

                    if( !$scope.model.ndp || !$scope.model.ndp.code ){
                        NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_ndp_configuration"));
                        return;
                    }

                    $scope.model.ndpProgram = $filter('filter')(optionSets, {code: 'ndpIIIProgram'})[0];

                    MetaDataFactory.getAll('dataSets').then(function(dataSets){
                        angular.forEach(dataSets, function(ds){
                            ds.dataElements = ds.dataElements.map(function(de){ return de.id; });
                            $scope.model.dataSetsById[ds.id] = ds;
                        });
                        $scope.model.dataSets = dataSets;

                        MetaDataFactory.getAll('dataElementGroupSets').then(function( dataElementGroupSets ){
                            $scope.model.dataElementGroupSets = dataElementGroupSets;

                            angular.forEach($scope.model.dataElementGroupSets, function(degs){
                                if( degs.indicatorGroupSetType === 'classification' ){
                                    $scope.model.classificationGroup = degs;
                                }
                            });

                            MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){
                                $scope.model.dataElementGroups = dataElementGroups;
                                $scope.model.selectedDataElementGroups = angular.copy( $scope.model.dataElementGroups );

                                MetaDataFactory.getAll('dataElements').then(function(dataElements){
                                    $scope.sortHeader = {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false};
                                    $scope.model.dictionaryHeaders = [
                                        {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'code', name: 'code', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'aggregationType', name: 'aggregationType', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'disaggregation', name: 'disaggregation', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'valueType', name: 'valueType', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'periodType', name: 'frequency', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'vote', name: 'vote', colSize: 'col-sm-1', show: true, fetch: false}
                                    ];

                                    angular.forEach($scope.model.attributes, function(att){
                                        if(att['dataElementAttribute'] && $scope.model.completeness.invalid.indexOf(att.code) === -1 ){
                                            var header = {id: att.code, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
                                            $scope.model.dictionaryHeaders.push(header);
                                        }
                                    });

                                    angular.forEach(dataElements, function(de){
                                        var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                        de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;
                                        var vote = [];
                                        var periodType = [];

                                        for(var i=0; i<$scope.model.dataSets.length; i++){
                                            if( $scope.model.dataSets[i].dataElements.indexOf(de.id) !== -1 ){
                                                var ds = $scope.model.dataSets[i];
                                                var pt = ds.periodType  === 'FinancialJuly' ? 'Fiscal year' : ds.periodType;
                                                if( periodType.indexOf(pt) === -1){
                                                    periodType.push(pt);
                                                }
                                                var votes = ds.organisationUnits.map(function(ou){return ou.code;});
                                                angular.forEach(votes, function(v){
                                                    if(vote.indexOf(v) === -1){
                                                        vote.push(v);
                                                    }
                                                });
                                            }
                                        }

                                        if( vote && vote.length > 0 ){
                                            vote = vote.sort();
                                            if ( vote.length > 10 ){
                                                de.orgUnit = vote.slice(0,5);
                                                de.orgUnit.push('...');
                                                de.orgUnit = de.orgUnit.join(', ');
                                            }
                                            de.vote = vote.join(', ');
                                        }

                                        if( periodType && periodType.length > 0 ){
                                            periodType = periodType.sort();
                                            de.periodType = periodType.join(', ');
                                        }

                                        de = $scope.getAttributeCompleteness( de );
                                        $scope.model.dataElementsById[de.id] = de;
                                    });

                                    $scope.getSelectedDataElementGroups();
                                    $scope.model.indicatorsFetched = true;
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    $scope.getAttributeCompleteness = function( item ){
        var size = 0;
        angular.forEach($scope.model.dictionaryHeaders, function(header){
            if( item[header.id] ){
                size++;
            }
        });

        item.completenessRate = size + ' / ' + $scope.model.dictionaryHeaders.length;

        var isGreen = true;

        for( var i=0; i<$scope.model.completeness.green.length; i++){
            if( !item[$scope.model.completeness.green[i]] || item[$scope.model.completeness.green[i]] === ''){
                isGreen = false;
                break;
            }
        }

        if( isGreen ){
            item.completeness = 'green-traffic-light';
            return item;
        }

        var isYellow = true;
        for( var i=0; i<$scope.model.completeness.yellow.length; i++){
            if( !item[$scope.model.completeness.yellow[i]] || item[$scope.model.completeness.yellow[i]] === ''){
                isYellow = false;
                break;
            }
        }

        if( isYellow ){
            item.completeness = 'yellow-traffic-light';
            return item;
        }

        item.completeness = 'red-traffic-light';
        return item;

    };

    $scope.showCategoryDetail = function(){
    };

    $scope.sortItems = function(header){
        $scope.reverse = ($scope.sortHeader && $scope.sortHeader.id === header.id) ? !$scope.reverse : false;
        $scope.sortHeader = header;
    };

    $scope.showDetails = function( item ){
        var modalInstance = $modal.open({
            templateUrl: 'components/dictionary/details-modal.html',
            controller: 'DictionaryDetailsController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders;
                },
                dictionaryItem: function(){
                    return item;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {
            $scope.model.dictionaryHeaders = gridColumns;
        });
    };

    $scope.showHideColumns = function(){
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders;
                },
                hiddenGridColumns: function(){
                    return ($filter('filter')($scope.model.dictionaryHeaders, {show: false})).length;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {
            $scope.model.dictionaryHeaders = gridColumns;
        });
    };

    $scope.itemExists = function( item ){
        return $scope.model.selectedDataElementGroups.indexOf( item ) !== -1;
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = "indicator-dictionary.xls";
        if( name ){
            reportName = name + '.xls';
        }
        saveAs(blob, reportName);
    };

    $scope.resetView = function( horizontalMenu ){
        $scope.model.selectedNDP = null;
        $scope.model.selectedProgram = null;
        $scope.model.selectedClassification = null;
        if ( horizontalMenu && horizontalMenu.id === 'default' ){
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.dataElementGroupSets );
            $scope.model.selectedDataElementGroups = angular.copy( $scope.model.dataElementGroups );
            $scope.getSelectedDataElementGroups();
        }
    };
});
