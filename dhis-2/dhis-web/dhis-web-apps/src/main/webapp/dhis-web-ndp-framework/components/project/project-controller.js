/* Controllers */

/* global ndpFramework */

ndpFramework.controller('ProjectController', 
    function($scope,
        $translate,
        $modal,
        $filter,
        NotificationService,
        SelectedMenuService,
        orderByFilter,
        PeriodService,
        MetaDataFactory,
        OrgUnitFactory,
        ProjectService) {
    
    $scope.model = {
        metaDataCached: false,
        data: null,
        reportReady: false,
        dataExists: false,
        dataHeaders: [],
        optionSetsById: [],
        optionSets: [],
        objectives: [],
        dataElementGroup: [],
        selectedDataElementGroupSets: [],
        dataElementGroups: [],
        selectedNdpProgram: null,
        selectedPeriods: [],
        periods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly'
    };
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/project/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/project/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/project/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/project/dashboard.html'}
    ];
    
    //Get orgunits for the logged in user
    OrgUnitFactory.getViewTreeRoot().then(function(response) {
        $scope.orgUnits = response.organisationUnits;
        angular.forEach($scope.orgUnits, function(ou){
            ou.show = true;
            angular.forEach(ou.children, function(o){
                o.hasChildren = o.children && o.children.length > 0 ? true : false;
            });
        });
        $scope.selectedOrgUnit = $scope.orgUnits[0] ? $scope.orgUnits[0] : null;
    });
    
    $scope.getObjectives = function(){
        $scope.model.dataElementGroup = [];
        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            angular.forEach(degs.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        });
    };
    
    $scope.$watch('model.selectedObjective', function(){
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedObjective) && $scope.model.selectedObjective.id){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {id: $scope.model.selectedObjective.id});
            angular.forEach($scope.model.selectedObjective.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        }
        else{
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.objectives );
            angular.forEach($scope.model.objectives, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }        
    });
    
    MetaDataFactory.getAll('optionSets').then(function(optionSets){
        
        $scope.model.optionSets = optionSets;
        
        angular.forEach(optionSets, function(optionSet){
            $scope.model.optionSetsById[optionSet.id] = optionSet;
        });
        
        MetaDataFactory.getAll('programs').then(function(programs){
            $scope.model.programs = programs;
            $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

            if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){                    
                $scope.model.ndpProgram = $filter('filter')($scope.model.optionSets, {ndp: $scope.model.selectedMenu.ndp, code: 'program'}, true)[0];
            }
        });
    });
        
    $scope.setNdpProgram = function( program ){
        $scope.model.attributesById = [];
        $scope.model.dataElementsById = [];
        
        if( $scope.model.selectedNdpProgram && $scope.model.selectedNdpProgram.id === program.id ){
            $scope.model.selectedNdpProgram = null;
        }
        else{
            $scope.model.selectedNdpProgram = program; 
        }
        
        if( $scope.model.selectedNdpProgram && $scope.model.selectedNdpProgram.code ){

            var prs = $filter('filter')($scope.model.programs, {ndpProgramme: $scope.model.selectedNdpProgram.code}, true);        
            $scope.model.selectedProgram = prs[0] || null;

            $scope.model.projects = [];
            if( $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programTrackedEntityAttributes ){            
                $scope.model.attributesById = $scope.model.selectedProgram.programTrackedEntityAttributes.reduce(function(map, obj){
                    map[obj.trackedEntityAttribute.id] = obj.trackedEntityAttribute;
                    return map;
                }, {});
           
                angular.forEach($scope.model.selectedProgram.programStages, function(stage){
                    angular.forEach(stage.programStageDataElements, function(prstDe){
                        var de = prstDe.dataElement;
                        if( de ){
                            $scope.model.dataElementsById[de.id] = de;
                        }                    
                    });
                });
            
            
                ProjectService.getByProgram($scope.selectedOrgUnit, $scope.model.selectedProgram, $scope.model.optionSetsById, $scope.model.attributesById ).then(function( data ){
                    $scope.model.projects = data;
                });
            }
        }
    };
    
    $scope.getProjectDetails = function( project ){
        if ( $scope.model.selectedProject && $scope.model.selectedProject.trackedEntityInstance === project.trackedEntityInstance ){
            $scope.model.showProjectDetails = !$scope.model.showProjectDetails;
        }
        else{
            $scope.model.showProjectDetails = true;
        }
        
        if( project && project.trackedEntityInstance && $scope.model.selectedProgram ){              
            ProjectService.get( project, $scope.model.selectedProgram, $scope.model.optionSetsById, $scope.model.attributesById , $scope.model.dataElementsById ).then(function( data ){
                $scope.model.selectedProject = data;
            });
        }
    };
    
    $scope.resetView = function(horizontalMenu){
        $scope.model.activeHorizontalMenu = horizontalMenu;
        
        $scope.resetDataView();
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };
    
    $scope.showOrgUnitTree = function(){
        var modalInstance = $modal.open({
            templateUrl: 'components/outree/orgunit-tree.html',
            controller: 'OuTreeController',
            resolve: {
                orgUnits: function(){
                    return $scope.orgUnits;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                }
            }
        });

        modalInstance.result.then(function ( selectedOu ) {
            if( selectedOu && selectedOu.id ){
                $scope.selectedOrgUnit = selectedOu;
                $scope.resetDataView();
            }
        }); 
    };
    
    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = $scope.model.selectedNdpProgram.displayName + " - project status" + " .xls";
        if( name ){
            reportName = name + ' performance.xls';
        }
        saveAs(blob, reportName);
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };
    
});