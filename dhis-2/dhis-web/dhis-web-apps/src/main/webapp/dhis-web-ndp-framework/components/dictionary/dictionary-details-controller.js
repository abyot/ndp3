/* Controllers */

/* global ndpFramework */

ndpFramework.controller('DictionaryDetailsController',
    function($scope, 
            $modalInstance,
            dictionaryItem,
            MetaDataFactory){
    
    $scope.dictionaryItem = dictionaryItem;
    $scope.model = {
        dataElementsById: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: [],
        attributes: [],
        dictionaryHeaders: []
    };

    
    MetaDataFactory.getAll('attributes').then(function(attributes){
            
        $scope.model.attributes = attributes;

        MetaDataFactory.getAll('programs').then(function( programs ){

            $scope.model.programs = programs;

            MetaDataFactory.getAll('categoryCombos').then(function(categoryCombos){
                angular.forEach(categoryCombos, function(cc){
                    $scope.model.categoryCombosById[cc.id] = cc;
                });

                MetaDataFactory.getAll('optionSets').then(function(optionSets){

                    $scope.model.optionSets = optionSets;

                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSetsById[optionSet.id] = optionSet;
                    });

                    MetaDataFactory.getAll('dataSets').then(function(dataSets){

                        angular.forEach(dataSets, function(ds){
                            ds.dataElements = ds.dataElements.map(function(de){ return de.id; });
                            $scope.model.dataSetsById[ds.id] = ds;
                        });

                        MetaDataFactory.getAll('dataElements').then(function(dataElements){

                            angular.forEach(dataElements, function(de){
                                $scope.model.dataElementsById[de.id] = de;
                                var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;

                                for(var i=0; i<dataSets.length; i++){
                                    var ds = dataSets[i];
                                    if( ds && ds.dataElements.indexOf(de.id) !== -1 ){
                                        de.periodType = ds.periodType  === 'FinancialJuly' ? 'Fiscal year' : ds.periodType;
                                        //de.vote = ds.organisationUnits.length > 1 ? ds.organisationUnits[0].code + ' and others' : ds.organisationUnits[0].code;
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

                            $scope.model.dictionaryHeaders = [
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
                                    $scope.model.dictionaryHeaders.push(header);
                                }
                            });
                        });
                    });
                });    
            });
        });
    });
    
    $scope.close = function () {
        $modalInstance.close($scope.gridColumns);
    };
    
    $scope.showHideColumns = function(gridColumn){
       
        if(gridColumn.show){                
            $scope.hiddenGridColumns--;            
        }
        else{
            $scope.hiddenGridColumns++;            
        }
    };    
});