/* global angular, dhis2, docLibrary */

'use strict';

//Controller for settings page
docLibrary.controller('HomeController',
        function($scope,
                $translate,
                $modal,
                $filter,
                $window,
                ModalService,
                NotificationService,
                SessionStorageService,
                EventService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                FileService,
                DHIS2URL) {
                    
    $scope.model = {
        optionSets: null,
        fileDataElement: null,
        typeDataElement: null,
        selectedOptionSet: null,
        events: [],
        programs: [],
        fileInput: null,
        showFileUpload: false
    };
    
    $scope.model.documentHeaders = [
        {id: 'dateUploaded', title: 'date_uploaded'},
        {id: 'uploadedBy', title: 'uploaded_by'},
        {id: 'name', title: 'file_name'},
        {id: 'type', title: 'file_type'},
        {id: 'size', title: 'file_size'}
    ];
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if ( !$scope.model.optionSets ){
                $scope.model.optionSets = [];
                MetaDataFactory.getAll('optionSets').then(function(optionSets){            
                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSets[optionSet.id] = optionSet;
                    });
                    $scope.loadPrograms($scope.selectedOrgUnit);
                });
            }
            else{
                $scope.loadPrograms($scope.selectedOrgUnit);
            }
        }
    });
    
    //load programs associated with the selected org unit.
    $scope.loadPrograms = function() {
        $scope.model.programs = [];
        $scope.model.selectedProgramStage = null;
        $scope.model.selectedOptionSet = null;
        $scope.model.documents = [];
        if (angular.isObject($scope.selectedOrgUnit)) {            
            ProgramFactory.getByOu( $scope.selectedOrgUnit ).then(function(res){
                $scope.model.programs = res.programs || [];
                $scope.model.selectedProgram = res.selectedProgram || null;
            });
        }
    };
    
    //watch for selection of program
    $scope.$watch('model.selectedProgram', function() {        
        $scope.model.selectedProgramStage = null;
        $scope.model.selectedOptionSet = null;
        $scope.model.documents = [];
        if( angular.isObject($scope.model.selectedProgram) && $scope.model.selectedProgram.id){
            $scope.loadProgramDetails();
        }
    });
    
    $scope.loadProgramDetails = function (){
        if( $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programStages.length > 0)
        {
            if ( $scope.model.selectedProgram.programStages.length > 1 )
            {
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_document_category"));
                return;
            }
            
            $scope.model.selectedProgramStage = $scope.model.selectedProgram.programStages[0];
            var prDes = $scope.model.selectedProgramStage.programStageDataElements;
            var de1 = prDes[0], de2 = prDes[1];
            
            if( !prDes || prDes.length !== 2 || !de1 || !de2 || !de1.dataElement || !de2.dataElement ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_document_category_configuration"));
                return;
            }
            
            de1 = de1.dataElement;
            de2 = de2.dataElement;
            
            if( de1.valueType === 'FILE_RESOURCE' ){
                $scope.model.typeDataElement = de2;
                $scope.model.fileDataElement = de1;
            }
            else{
                $scope.model.typeDataElement = de1;
                $scope.model.fileDataElement = de2;
            }
            
            if( !$scope.model.typeDataElement.optionSetValue ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_document_type_configuration"));
                return;
            }

            $scope.model.selectedOptionSet = $scope.model.optionSets[$scope.model.typeDataElement.optionSet.id];
            
            if( !$scope.model.selectedOptionSet || $scope.model.selectedOptionSet.lenth === 0 ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_document_types"));
                return;
            }
            
            $scope.fetchEvents();
        }
    };
    
    $scope.fetchEvents = function(){
        
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            
            EventService.getByOrgUnitAndProgram($scope.selectedOrgUnit.id, 'SELECTED', $scope.model.selectedProgram.id, $scope.model.typeDataElement, $scope.model.fileDataElement).then(function(events){
                $scope.model.documents = events;
            });
        }
    };
    
    $scope.showFileUpload = function(){
        $scope.model.showFileUpload = true;
        
    };
    
    $scope.cancelFileUpload = function(){
        
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'warning',
            bodyText: 'are_you_sure_to_cancel_file_upload'
        };

        ModalService.showModal({}, modalOptions).then(function(result){            
            $scope.model.showFileUpload = false;
        });
    };
    
    $scope.uploadFile = function( fileType ){

        if( !fileType || !fileType.code || !$scope.model.fileInput || $scope.model.fileInput.length === 0){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("no_files_to_upload"));
            return;
        }

        angular.forEach($scope.model.fileInput, function(f){
            
            FileService.upload(f).then(function(data){
                    
                if(data && data.status === 'OK' && data.response && data.response.fileResource && data.response.fileResource.id && data.response.fileResource.name){
                    var ev = {
                        program: $scope.model.selectedProgram.id,
                        programStage: $scope.model.selectedProgramStage.id,
                        orgUnit: $scope.selectedOrgUnit.id,
                        status: 'ACTIVE',
                        eventDate: DateUtils.getToday(),
                        dataValues: [{
                            dataElement: $scope.model.typeDataElement.id,
                            value: fileType.code
                        },{
                            dataElement: $scope.model.fileDataElement.id,
                            value: data.response.fileResource.id
                        }]
                    };
                    
                    EventService.create(ev).then(function(data){
                        console.log('data:  ', data);
                    });
                }
                else{
                    NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("file_upload_failed") + f.name );
                }
            });

        });
    };
    
    $scope.downloadFile = function(path, e){
        if( path ){
            $window.open(DHIS2URL + path, '_blank', '');
        }
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
    };
    
    $scope.deleteFile = function(document, e){
        
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'warning',
            bodyText: 'are_you_sure_to_delete_file'
        };

        ModalService.showModal({}, modalOptions).then(function(result){            
            if( document ){
                EventService.deleteEvent(document).then(function(data){
                });
            }
            if(e){
                e.stopPropagation();
                e.preventDefault();
            }
        });
        
    };

});
