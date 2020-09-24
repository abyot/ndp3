/* global angular, ndpDataEntry */

'use strict';


ndpDataEntry.controller('CommentController',
        function($scope,
                $modalInstance,
                dataValues,
                selectedOrgUnit,
                selectedPeriod,
                dataElement,
                selectedCategoryCombo,
                selectedCategoryOptionCombo,
                selectedAttributeCategoryCombo,
                CommonUtils,
                DataValueService){ 
    
    $scope.saveStatus = {};            
    $scope.dataValues = dataValues;
    $scope.selectedOrgUnit = selectedOrgUnit;
    $scope.selectedPeriod = selectedPeriod;
    $scope.selectedDataElement = dataElement;
    $scope.selectedCategoryCombo = selectedCategoryCombo;
    $scope.selectedCategoryOptionCombo = selectedCategoryOptionCombo;
    $scope.selectedAttributeCategoryCombo = selectedAttributeCategoryCombo;
    
    $scope.close = function () {        
        $modalInstance.close( $scope.dataValues );
    };

    $scope.saveComment = function(deId, ocId, aoc){

        $scope.saveStatus[ deId + '-' + ocId + '-' + aoc.id ] = {saved: false, pending: true, error: false};
        
        var dataValue = {ou: $scope.selectedOrgUnit.id,
                    pe: $scope.selectedPeriod.id,
                    de: deId,
                    co: ocId,
                    comment: $scope.dataValues[deId][ocId][aoc.id].comment
                };
        
        if( $scope.selectedAttributeCategoryCombo && !$scope.selectedAttributeCategoryCombo.isDefault ){            
            dataValue.cc = $scope.selectedAttributeCategoryCombo.id;
            dataValue.cp = CommonUtils.getOptionIds(aoc.categoryOptions);
        }
        
        DataValueService.saveComment( dataValue ).then(function(response){
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].saved = true;
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].pending = false;
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].error = false;
        }, function(){
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].saved = false;
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].pending = false;
            $scope.saveStatus[deId + '-' + ocId + '-' + aoc.id].error = true;
        });
    };
    
    $scope.getInputNotifcationClass = function(deId, ocId, aocId){

        var currentElement = $scope.saveStatus[deId + '-' + ocId + '-' + aocId];        
        if( currentElement ){
            if(currentElement.pending){
                return 'form-control input-pending';
            }

            if(currentElement.saved){
                return 'form-control input-success';
            }            
            else{
                return 'form-control input-error';
            }
        }    
        
        return 'form-control';
    };
});