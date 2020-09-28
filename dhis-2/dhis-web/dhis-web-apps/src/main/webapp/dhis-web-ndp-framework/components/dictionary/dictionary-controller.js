/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('DictionaryController',
        function($scope,
                $translate,
                $modal,
                $filter,
                MetaDataFactory) {

    $scope.model = {
        metaDataCached: false,
        data: null,
        dataElements: [],
        dataElementsById: [],
        dataElementGroups: [],
        dataElementGroupSets: [],
        selectedDataElementGroups: [],
        selectedDataElementGroupSets: [],
        baseLineTargetActualDimensions: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
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
        programs: [],
        selectedProgram: null,
        groupSetSize: {},
        physicalPerformance: true,
        financialPerformance: true,
        showProjectDetails: false
    };

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

                $scope.model.ndp = $filter('filter')(optionSets, {code: 'ndp'})[0];
                $scope.model.ndpProgram = $filter('filter')(optionSets, {code: 'ndpIIIProgram'})[0];


                MetaDataFactory.getAll('dataSets').then(function(dataSets){

                    angular.forEach(dataSets, function(ds){
                        ds.dataElements = ds.dataElements.map(function(de){ return de.id; });
                        $scope.model.dataSetsById[ds.id] = ds;
                    });

                    $scope.model.dataSets = dataSets;

                    MetaDataFactory.getAll('dataElementGroupSets').then(function( dataElementGroupSets ){
                        $scope.model.dataElementGroupSets = dataElementGroupSets;
                        MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroups){
                            $scope.model.dataElementGroups = dataElementGroups;

                            MetaDataFactory.getAll('dataElements').then(function(dataElements){

                                angular.forEach(dataElements, function(de){
                                    $scope.model.dataElementsById[de.id] = de;
                                    var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                    de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;

                                    for(var i=0; i<$scope.model.dataSets.length; i++){
                                        if( $scope.model.dataSets[i].dataElements.indexOf(de.id) !== -1 ){
                                            var ds = $scope.model.dataSets[i];
                                            de.periodType = ds.periodType  === 'FinancialJuly' ? 'Fiscal year' : ds.periodType;
                                            de.vote = ds.organisationUnits.map(function(ou){
                                                return ou.code;
                                            });

                                            if( de.vote && de.vote.length > 0 ){
                                                de.vote = de.vote.sort();
                                                de.vote = de.vote.join(', ');
                                            }
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
                            });
                        });
                    });
                });
            });
        });
    });
    
    $scope.showCategoryDetail = function(){
    };
    
    $scope.sortItems = function(header){
        $scope.reverse = ($scope.sortHeader && $scope.sortHeader.id === header.id) ? !$scope.reverse : false;
        $scope.sortHeader = header;
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
});
