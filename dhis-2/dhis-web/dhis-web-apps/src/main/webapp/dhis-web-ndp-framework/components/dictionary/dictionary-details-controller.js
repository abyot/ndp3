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
        dictionaryHeaders: [],
        completeness: {
            green: ['displayName', 'code', 'periodType', 'computationMethod', 'indicatorType', 'preferredDataSource', 'rationale', 'responsibilityForIndicator', 'unit'],
            yellow: ['displayName', 'code', 'accountabilityForIndicator', 'computationMethod', 'preferredDataSource', 'unit'],
            invalid: ['isProgrammeDocument', 'isDocumentFolder']
        }
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
                                var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;
                                var vote = [];
                                var periodType = [];

                                for(var i=0; i<dataSets.length; i++){
                                    var ds = dataSets[i];
                                    if( ds && ds.dataElements.indexOf(de.id) !== -1 ){
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
                                    de.vote = vote.join(', ');
                                }

                                if( periodType && periodType.length > 0 ){
                                    periodType = periodType.sort();
                                    de.periodType = periodType.join(', ');
                                }
                                $scope.model.dataElementsById[de.id] = de;
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
                                if(att['dataElementAttribute'] && $scope.model.completeness.invalid.indexOf(att.code) === -1 ){
                                    var header = {id: att.code, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
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
        $modalInstance.close($scope.model.dictionaryHeaders);
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