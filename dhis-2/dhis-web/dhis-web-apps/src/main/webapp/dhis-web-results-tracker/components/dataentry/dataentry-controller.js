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
        dataElementGroups: [],
        dataElementGroupSets: [],
        selectedDataElementGroups: [],
        selectedDataElementGroupSets: [],
        baseLineTargetActualDimensions: [],
        selectedAttributeCategoryCombo: null,
        selectedAttributeOptionCombos: null,
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: null,
        dictionaryItems: [],
        attributes: [],
        selectedPeriod: null,
        periods: [],
        periodOffset: 0
    };

    $scope.$watch('selectedOrgUnit', function() {
        $scope.resetDataView();
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

    var resetParams = function(){
        $scope.model.dataValues = {};
        $scope.model.roleValues = {};
        $scope.model.orgUnitsWithValues = [];
        $scope.model.selectedEvent = {};
        $scope.model.valueExists = false;
        $scope.model.stakeholderRoles = {};
        $scope.model.basicAuditInfo = {};
        $scope.model.basicAuditInfo.exists = false;
        $scope.model.rolesAreDifferent = false;
        $scope.saveStatus = {};
        $scope.commonOrgUnit = null;
        $scope.commonOptionCombo = null;
    };

    $scope.resetDataView = function(){
        $scope.model.dataSets = [];
        $scope.model.periods = [];
        $scope.model.selectedAttributeCategoryCombo = null;
        $scope.model.selectedAttributeOptionCombos = null;
        $scope.model.selectedPeriod = null;
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.saveStatus = {};
        $scope.model.categoryOptionsReady = false;
    };

    //load datasets associated with the selected org unit.
    $scope.loadDataSets = function() {
        $scope.resetDataView();
        if (angular.isObject($scope.selectedOrgUnit)) {
            DataSetFactory.getResultsDataSets( $scope.selectedOrgUnit).then(function(dataSets){
                console.log('data sets:  ', dataSets);
                $scope.model.dataSets = dataSets || [];
            });
        }
    };

    //watch for selection of data set
    $scope.$watch('model.selectedDataSet', function() {
        $scope.model.periods = [];
        $scope.model.selectedPeriod = null;
        $scope.model.categoryOptionsReady = false;
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        if( angular.isObject($scope.model.selectedDataSet) && $scope.model.selectedDataSet.id){
            $scope.loadDataSetDetails();
        }
    });

    $scope.$watch('model.selectedPeriod', function(){
        $scope.dataValues = {};
        $scope.dataValuesCopy = {};
        $scope.saveStatus = {};
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
                $scope.model.selectedAttributeCategoryCombo = $scope.model.categoryCombosById[$scope.model.selectedDataSet.categoryCombo.id];
            }

            if(!$scope.model.selectedAttributeCategoryCombo || $scope.model.selectedAttributeCategoryCombo.categoryOptionCombos.legth < 1 ){
                CommonUtils.notify('error', 'missing_dataset_category_combo');
                return;
            }

            $scope.model.dataElements = [];
            $scope.tabOrder = {};
            var idx = 0;
            angular.forEach($scope.model.selectedDataSet.dataElements, function(de){
                $scope.model.dataElements[de.id] = de;
                $scope.tabOrder[de.id] = {};
                angular.forEach($scope.model.categoryCombosById[de.categoryCombo.id].categoryOptionCombos, function(oco){
                    $scope.tabOrder[de.id][oco.id] = idx++;
                });
            });
        }
    };

    var copyDataValues = function(){
        $scope.dataValuesCopy = angular.copy( $scope.dataValues );
    };

    $scope.loadDataEntryForm = function(){
        $scope.saveStatus = {};
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id &&
                $scope.model.selectedDataSet && $scope.model.selectedDataSet.id &&
                $scope.model.selectedPeriod && $scope.model.selectedPeriod.id ){

            var dataValueSetUrl = 'dataSet=' + $scope.model.selectedDataSet.id;

            dataValueSetUrl += '&period=' + $scope.model.selectedPeriod.id;

            dataValueSetUrl += '&orgUnit=' + $scope.selectedOrgUnit.id;

            DataValueService.getDataValueSet( dataValueSetUrl ).then(function( response ){
                if( response.dataValues && response.dataValues.length > 0 ){
                    $scope.model.valueExists = true;

                    angular.forEach(response.dataValues, function(dv){

                        dv.value = CommonUtils.formatDataValue( $scope.model.dataElements[dv.dataElement], dv.value, $scope.model.optionSetsById, 'USER' );

                        if(!$scope.dataValues[dv.dataElement]){
                            $scope.dataValues[dv.dataElement] = {};
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = {};
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo][dv.attributeOptionCombo] = dv;
                        }
                        else if(!$scope.dataValues[dv.dataElement][dv.categoryOptionCombo]){
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo] = {};
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo][dv.attributeOptionCombo] = dv;
                        }
                        else if(!$scope.dataValues[dv.dataElement][dv.categoryOptionCombo][dv.attributeOptionCombo]){
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo][dv.attributeOptionCombo] = dv;
                        }

                        if( dv.comment ){
                            $scope.dataValues[dv.dataElement][dv.categoryOptionCombo].hasComment = true;
                        }
                    });

                    copyDataValues();
                }
            });

            CompletenessService.get( $scope.model.selectedDataSet.id,
                                    $scope.selectedOrgUnit.id,
                                    $scope.model.selectedPeriod.startDate,
                                    $scope.model.selectedPeriod.endDate,
                                    false).then(function(response){
                if( response &&
                        response.completeDataSetRegistrations &&
                        response.completeDataSetRegistrations.length &&
                        response.completeDataSetRegistrations.length > 0){

                    $scope.model.dataSetCompletness = true;
                }
            });
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

    $scope.saveDataValue = function( deId, ocId ){

        //check for form validity
        if( $scope.outerForm.$invalid ){
            $scope.outerForm.$error = {};
            $scope.outerForm.$setPristine();
            return ;
        }

        //form is valid
        $scope.saveStatus[ deId + '-' + ocId ] = {saved: false, pending: true, error: false};

        var dataValue = {ou: $scope.selectedOrgUnit.id,
                    pe: $scope.model.selectedPeriod.id,
                    de: deId,
                    co: ocId,
                    value: $scope.dataValues[deId][ocId].value
                };

        dataValue.value = CommonUtils.formatDataValue( $scope.model.dataElements[deId], dataValue.value, $scope.model.optionSetsById, 'API' );

        var deleteComment = false;
        if( !dataValue.value ){
            dataValue.value =  "";
            if( $scope.dataValues[deId][ocId].comment ){
                deleteComment = true;
                $scope.dataValues[deId][ocId].comment = "";
            }
        }

        if( $scope.model.selectedAttributeCategoryCombo && !$scope.model.selectedAttributeCategoryCombo.isDefault ){
            dataValue.cc = $scope.model.selectedAttributeCategoryCombo.id;
            dataValue.cp = CommonUtils.getOptionIds($scope.model.selectedOptions);
        }

        var processDataValue = function(){
            copyDataValues();
        };

        var saveSuccessStatus = function(){
            $scope.saveStatus[deId + '-' + ocId].saved = true;
            $scope.saveStatus[deId + '-' + ocId].pending = false;
            $scope.saveStatus[deId + '-' + ocId].error = false;
        };

        var saveFailureStatus = function(){
            $scope.saveStatus[deId + '-' + ocId].saved = false;
            $scope.saveStatus[deId + '-' + ocId].pending = false;
            $scope.saveStatus[deId + '-' + ocId].error = true;
        };

        console.log('data value:  ', dataValue);
        /*DataValueService.saveDataValue( dataValue ).then(function(){
            if( deleteComment ){
                dataValue.comment = "";
                DataValueService.saveComment( dataValue ).then(function(){
                });
            }
           saveSuccessStatus();
           processDataValue();
        }, function(){
            saveFailureStatus();
        });*/
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

    $scope.getCommentValue = function( dataElementId, optionComboId ){
        var comments = [], hasAttachement = false, hasExplanation = false;
        if( $scope.dataValues[dataElementId] && $scope.dataValues[dataElementId][optionComboId] ){
            var values = $scope.dataValues[dataElementId][optionComboId];
            for( var key in values ){
                if( values[key].comment ){
                    var comment = JSON.parse( angular.copy( values[key].comment) );
                    if(comment.attachment){
                        hasAttachement = true;
                    }
                    if(comment.explanation){
                        hasExplanation = true;
                    }
                }
            }
        }
        if(hasAttachement){
            comments.push('has_attachment');
        }
        if(hasExplanation){
            comments.push('has_explanation');
        }
        return comments.join('_');
    };

    $scope.displayCommentBox = function( dataElementId, optionCombo ){
        var dataElement = $scope.model.dataElements[dataElementId];
        var modalInstance = $modal.open({
            templateUrl: 'components/comment/comment.html',
            controller: 'CommentController',
            windowClass: 'comment-modal-window',
            resolve: {
                dataElement: function(){
                    return dataElement;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                },
                selectedPeriod: function(){
                    return $scope.model.selectedPeriod;
                },
                dataValues: function(){
                    return $scope.dataValues;
                },
                selectedCategoryOptionCombo: function(){
                    return optionCombo;
                },
                selectedCategoryCombo: function(){
                    return $scope.model.categoryCombosById[dataElement.categoryCombo.id];
                },
                selectedAttributeCategoryCombo: function(){
                    return $scope.model.selectedAttributeCategoryCombo;
                }
            }
        });

        modalInstance.result.then(function( dataValues ) {
            $scope.dataValues = dataValues;
        });
    };
});