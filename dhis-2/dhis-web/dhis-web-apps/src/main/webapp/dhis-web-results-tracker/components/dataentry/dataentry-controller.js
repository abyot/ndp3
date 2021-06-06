/* global angular, dhis2, rt */

'use strict';

//Controller for settings page
rt.controller('DataEntryController',
        function($scope,
                $modal,
                MetaDataFactory,
                DataSetFactory,
                PeriodService,
                CommonUtils,
                DataValueService,
                CompletenessService,
                ModalService,
                DialogService) {

    $scope.saveStatus = {};
    $scope.model = {
        metaDataCached: false,
        dataValuesCopy: {},
        dataValues: {},
        dataElements: [],
        dataElementsById: [],
        selectedAttributeCategoryCombo: null,
        selectedAttributeOptionCombo: null,
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: null,
        selectedPeriod: null,
        periods: [],
        periodOffset: 0
    };

    $scope.$watch('selectedOrgUnit', function() {
        $scope.resetParams();
        if( angular.isObject($scope.selectedOrgUnit)){
            if(!$scope.model.optionSetsById){
                $scope.model.optionSetsById = {};
                MetaDataFactory.getAll('optionSets').then(function(opts){
                    angular.forEach(opts, function(op){
                        $scope.model.optionSetsById[op.id] = op;
                    });

                    MetaDataFactory.getAll('categoryCombos').then(function(ccs){
                        angular.forEach(ccs, function(cc){
                            $scope.model.categoryCombosById[cc.id] = cc;
                        });
                        $scope.loadDataSets($scope.selectedOrgUnit);
                    });
                });
            }
            else{
                $scope.loadDataSets($scope.selectedOrgUnit);
            }
        }
    });

    $scope.resetParams = function(){
        $scope.model.dataSets = [];
        $scope.model.periods = [];
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombo = null;
        $scope.model.selectedPeriod = null;
        $scope.dataValues = {};
        $scope.model.categoryOptionsReady = false;
    };

    $scope.resetDataView = function(){
        $scope.saveStatus = {};
        $scope.dataValues = {};
    };

    //load datasets associated with the selected org unit.
    $scope.loadDataSets = function() {
        $scope.resetParams();
        if (angular.isObject($scope.selectedOrgUnit)) {
            DataSetFactory.getResultsDataSets( $scope.selectedOrgUnit).then(function(dataSets){
                $scope.model.dataSets = dataSets || [];
            });
        }
    };

    //watch for selection of data set
    $scope.$watch('model.selectedDataSet', function() {
        $scope.model.periods = [];
        $scope.model.selectedPeriod = null;
        $scope.model.categoryOptionsReady = false;
        if( angular.isObject($scope.model.selectedDataSet) && $scope.model.selectedDataSet.id){
            $scope.loadDataSetDetails();
        }
    });

    $scope.$watch('model.selectedPeriod', function(){
        $scope.loadDataEntryForm();
    });

    $scope.loadDataSetDetails = function(){
        if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.id && $scope.model.selectedDataSet.periodType){

            $scope.model.periods = PeriodService.getPeriods( $scope.model.selectedDataSet.periodType, $scope.model.periodOffset,  $scope.model.selectedDataSet.openFuturePeriods );

            if(!$scope.model.selectedDataSet.dataElements || $scope.model.selectedDataSet.dataElements.length < 1){
                CommonUtils.notify('error', 'missing_data_elements_indicators');
                return;
            }

            $scope.model.selectedAttributeCategoryCombo = null;
            if( $scope.model.selectedDataSet && $scope.model.selectedDataSet.categoryCombo && $scope.model.selectedDataSet.categoryCombo.id ){
                $scope.model.selectedAttributeCategoryCombo = angular.copy($scope.model.categoryCombosById[$scope.model.selectedDataSet.categoryCombo.id]);
            }

            if(!$scope.model.selectedAttributeCategoryCombo || $scope.model.selectedAttributeCategoryCombo.categoryOptionCombos.legth < 1 ){
                CommonUtils.notify('error', 'missing_dataset_category_combo');
                return;
            }

            if( $scope.model.selectedAttributeCategoryCombo && $scope.model.selectedAttributeCategoryCombo.isDefault ){
                $scope.model.categoryOptionsReady = true;
                $scope.model.selectedOptions = $scope.model.selectedAttributeCategoryCombo.categories[0].categoryOptions;
            }

            $scope.model.dataElements = [];
            $scope.tabOrder = {};
            var idx = 0;
            angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                $scope.model.dataElements[de.id] = de;
                $scope.tabOrder[de.id] = {};
                angular.forEach($scope.model.categoryCombosById[de.categoryCombo.id].categoryOptionCombos, function(oco){
                    $scope.tabOrder[de.id][oco.id] = {
                        index: idx++,
                        name: de.id + '-' + oco.id
                    };
                });
            });
        }
    };

    $scope.loadDataEntryForm = function(){
        $scope.resetDataView();

        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id &&
                $scope.model.selectedDataSet && $scope.model.selectedDataSet.id &&
                $scope.model.selectedPeriod && $scope.model.selectedPeriod.id &&
                $scope.model.categoryOptionsReady){

            $scope.model.selectedAttributeOptionCombo = CommonUtils.getOptionComboIdFromOptionNames($scope.model.selectedAttributeCategoryCombo, $scope.model.selectedOptions);
            if ( $scope.model.selectedAttributeOptionCombo && $scope.model.selectedAttributeOptionCombo.id ){

                var dataValueSetUrl = 'dataSet=' + $scope.model.selectedDataSet.id;

                dataValueSetUrl += '&attributeOptionCombo=' + $scope.model.selectedAttributeOptionCombo.id;

                dataValueSetUrl += '&period=' + $scope.model.selectedPeriod.id;

                dataValueSetUrl += '&orgUnit=' + $scope.selectedOrgUnit.id;

                DataValueService.getDataValueSet( dataValueSetUrl ).then(function( response ){
                    if( response.dataValues && response.dataValues.length > 0 ){
                        $scope.model.valueExists = true;

                        angular.forEach(response.dataValues, function(dv){

                            dv.value = CommonUtils.formatDataValue( dv.value, $scope.model.dataElements[dv.dataElement], $scope.model.optionSetsById, 'USER' );

                            if(!$scope.dataValues[dv.dataElement]){
                                $scope.dataValues[dv.dataElement] = {};
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }
                            else if(!$scope.dataValues[dv.dataElement][dv.categoryOptionCombo]){
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = dv;
                            }

                            if( dv.comment ){
                                $scope.dataValues[dv.dataElement][dv.categoryOptionCombo].hasComment = true;
                            }
                        });
                    }
                });
            }
            else{
                CommonUtils.notify('error', 'invalid_result_tagging_combination');
                return;
            }
        }
    };

    $scope.interacted = function(field) {
        var status = false;
        if(field){
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;
    };

    function checkOptions(){
        for(var i=0; i<$scope.model.selectedAttributeCategoryCombo.categories.length; i++){
            if($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption && $scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption.id){
                $scope.model.categoryOptionsReady = true;
                $scope.model.selectedOptions.push($scope.model.selectedAttributeCategoryCombo.categories[i].selectedOption);
            }
            else{
                $scope.model.categoryOptionsReady = false;
                break;
            }
        }
        if($scope.model.categoryOptionsReady){
            $scope.loadDataEntryForm();
        }
    };

    $scope.getCategoryOptions = function(){
        $scope.model.categoryOptionsReady = false;
        $scope.model.selectedOptions = [];
        checkOptions();
    };

    $scope.getPeriods = function(mode){
        $scope.model.selectedPeriod = null;

        $scope.model.periodOffset = mode === 'NXT' ? ++$scope.model.periodOffset : --$scope.model.periodOffset;

        $scope.model.periods = PeriodService.getPeriods( $scope.model.selectedDataSet.periodType, $scope.model.periodOffset,  $scope.model.selectedDataSet.openFuturePeriods );
    };

    $scope.saveDataValue = function( deId, ocId, saveComment ){

        //check for form validity
        if( $scope.outerForm.$invalid ){
            $scope.outerForm.$error = {};
            $scope.outerForm.$setPristine();
            return ;
        }

        //form is valid
        var fieldId = deId + '-' + ocId;
        if ( saveComment ){
            fieldId += '-comment';
        }
        $scope.saveStatus = {};
        $scope.saveStatus[ fieldId ] = {saved: false, pending: true, error: false};

        var dataValue = {ou: $scope.selectedOrgUnit.id,
                    pe: $scope.model.selectedPeriod.id,
                    de: deId,
                    co: ocId,
                    value: $scope.dataValues[deId][ocId].value,
                    comment: $scope.dataValues[deId][ocId].comment
                };

        dataValue.value = CommonUtils.formatDataValue( dataValue.value, $scope.model.dataElements[deId], $scope.model.optionSetsById, 'API' );

        if( $scope.model.selectedAttributeCategoryCombo && !$scope.model.selectedAttributeCategoryCombo.isDefault ){
            dataValue.cc = $scope.model.selectedAttributeCategoryCombo.id;
            dataValue.cp = CommonUtils.getOptionIds($scope.model.selectedOptions);
        }

        var deleteValue = false, deleteComment;
        if( !dataValue.value ){
            dataValue.value =  "";
            deleteValue = true;
            if( $scope.dataValues[deId][ocId].comment ){
                deleteComment = true;
                $scope.dataValues[deId][ocId].comment = "";
            }
        }

        var saveSuccessStatus = function(){
            $scope.saveStatus[fieldId].saved = true;
            $scope.saveStatus[fieldId].pending = false;
            $scope.saveStatus[fieldId].error = false;
        };

        var saveFailureStatus = function(){
            $scope.saveStatus[fieldId].saved = false;
            $scope.saveStatus[fieldId].pending = false;
            $scope.saveStatus[fieldId].error = true;
        };

        if ( deleteValue ){
            DataValueService.deleteDataValue( dataValue ).then(function(){
               saveSuccessStatus();
            }, function(){
                saveFailureStatus();
            });
        }
        else{
            DataValueService.saveDataValue( dataValue ).then(function(){
               saveSuccessStatus();
            }, function(){
                saveFailureStatus();
            });
        }
    };

    $scope.saveCompletness = function(){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_complete',
            bodyText: 'are_you_sure_to_save_completeness'
        };

        ModalService.showModal({}, modalOptions).then(function(result){
            var dsr = {completeDataSetRegistrations: []};
            angular.forEach($scope.model.selectedAttributeCategoryCombo.categoryOptionCombos, function(aoc){
                dsr.completeDataSetRegistrations.push( {dataSet: $scope.model.selectedDataSet.id, organisationUnit: $scope.selectedOrgUnit.id, period: $scope.model.selectedPeriod.id, attributeOptionCombo: aoc.id} );
            });

            CompletenessService.saveDsr(dsr).then(function(response){
                var dialogOptions = {
                    headerText: 'success',
                    bodyText: 'marked_complete'
                };
                DialogService.showDialog({}, dialogOptions);
                $scope.model.dataSetCompletness = true;

            }, function(response){
                CommonUtils.errorNotifier( response );
            });
        });
    };

    $scope.deleteCompletness = function( orgUnit, multiOrgUnit){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'mark_incomplete',
            bodyText: 'are_you_sure_to_delete_completeness'
        };

        ModalService.showModal({}, modalOptions).then(function(result){

            angular.forEach($scope.model.selectedAttributeCategoryCombo.categoryOptionCombos, function(aoc){
                CompletenessService.delete($scope.model.selectedDataSet.id,
                    $scope.model.selectedPeriod.id,
                    $scope.selectedOrgUnit.id,
                    $scope.model.selectedAttributeCategoryCombo.id,
                    CommonUtils.getOptionIds(aoc.categoryOptions),
                    false).then(function(response){

                    var dialogOptions = {
                        headerText: 'success',
                        bodyText: 'marked_incomplete'
                    };
                    DialogService.showDialog({}, dialogOptions);
                    $scope.model.dataSetCompletness = false;

                }, function(response){
                    CommonUtils.errorNotifier( response );
                });
            });
        });
    };

    $scope.getInputNotifcationClass = function(deId, ocId, comment){

        var currentElement = $scope.saveStatus[deId + '-' + ocId];
        if ( comment ){
            currentElement = $scope.saveStatus[deId + '-' + ocId + '-comment'];
        }

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