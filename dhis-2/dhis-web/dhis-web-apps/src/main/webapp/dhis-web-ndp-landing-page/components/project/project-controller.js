/* Controllers */

/* global ndpFramework, parseFloat */

ndpFramework.controller('ProjectController',
    function($scope,
        $translate,
        $modal,
        $filter,
        NotificationService,
        SelectedMenuService,
        MetaDataFactory,
        OrgUnitFactory,
        ProjectService) {

    $scope.model = {
        metaDataCached: false,
        showOnlyCoreProject: false,
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
        ndpProgrammes: [],
        selectedPeriods: [],
        periods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        coreProjectAttribute: null,
        bac: null,
        ac: null,
        timePerformance: [],
        costPerformance: []
    };

    $scope.model.horizontalMenus = [
        {id: 'synthesis', title: 'project_synthesis', order: 1, view: 'components/project/synthesis.html', active: true, class: 'main-horizontal-menu'},
        {id: 'time_performance', title: 'time_performance', order: 2, view: 'components/project/time-performance.html', class: 'main-horizontal-menu'},
        {id: 'cost_performance', title: 'cost_performance', order: 3, view: 'components/project/cost-performance.html', class: 'main-horizontal-menu'}
    ];

    $scope.model.performanceHeaders = [
        {id: 'KPI', displayName: $translate.instant("kpi"), order: 1},
        {id: 'IND', displayName: $translate.instant('indicator'), order: 2},
        {id: 'INT', displayName: $translate.instant('interpretation'), order: 3},
        {id: 'UNI', displayName: $translate.instant('unit'), order: 4},
        {id: 'BSL', displayName: $translate.instant('baseline'), order: 5}
    ];

    $scope.$watch('model.selectedProgram', function(){
        $scope.resetData();
        if ( $scope.model.selectedMenu && $scope.model.selectedMenu.code ){
            $scope.fetchProgramDetails();
        }
    });

    MetaDataFactory.getAll('optionSets').then(function(optionSets){

        $scope.model.optionSets = optionSets;

        angular.forEach(optionSets, function(optionSet){
            $scope.model.optionSetsById[optionSet.id] = optionSet;
        });

        $scope.model.ndp = $filter('getFirst')($scope.model.optionSets, {code: 'ndp'});

        MetaDataFactory.getAll('programs').then(function(programs){
            $scope.model.programs = $filter('filter')(programs, {programType: 'WITH_REGISTRATION'}, true);

            $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

            if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){
                $scope.model.ndpProgrammes = $filter('filter')($scope.model.programs, {ndp: $scope.model.selectedMenu.ndp});
            }

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
        });
    });

    $scope.fetchProgramDetails = function(){
        $scope.model.coreProjectAttribute = null;
        if( $scope.model.selectedMenu && $scope.model.selectedMenu.code && $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programTrackedEntityAttributes ){

            $scope.model.projectFetchStarted = true;

            angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pta){
                $scope.model.attributesById[pta.trackedEntityAttribute.id] = pta.trackedEntityAttribute;
                if( pta.trackedEntityAttribute.isCoreProject ){
                    $scope.model.coreProjectAttribute = pta.trackedEntityAttribute;
                }
                else if( pta.trackedEntityAttribute.isTotalProjectCost ){
                    $scope.model.bac = pta.trackedEntityAttribute;
                }
            });

            angular.forEach($scope.model.selectedProgram.programStages, function(stage){
                angular.forEach(stage.programStageDataElements, function(prstDe){
                    var de = prstDe.dataElement;
                    if( de ){
                        $scope.model.dataElementsById[de.id] = de;

                        if( de.isCurrentProjectCost ){
                            $scope.model.ac = de;
                        }
                    }
                });
            });

            ProjectService.getByProgram($scope.selectedOrgUnit, $scope.model.selectedProgram, $scope.model.optionSetsById, $scope.model.attributesById ).then(function( data ){
                $scope.model.projects = data;
                $scope.model.projectsFetched = true;
                $scope.model.projectFetchStarted = false;
            });
        }
    };

    $scope.getProjectDetails = function( project ){
        if ( $scope.model.selectedProject && $scope.model.selectedProject.trackedEntityInstance === project.trackedEntityInstance ){
            $scope.model.showProjectDetails = !$scope.model.showProjectDetails;
        }
        else{
            $scope.model.showProjectDetails = true;
            $scope.model.timePerformance = [];
            $scope.model.costPerformance = [];
            $scope.model.indicatorValuesById = [];
            if( project && project.trackedEntityInstance && $scope.model.selectedProgram ){
                ProjectService.get( project, $scope.model.selectedProgram, $scope.model.optionSetsById, $scope.model.attributesById , $scope.model.dataElementsById ).then(function( data ){

                    $scope.model.selectedProject = data;

                    angular.forEach($scope.model.selectedProgram.programIndicators, function(ind){
                        var res = ProjectService.getProjectKpi(project, ind);
                        if ( res.numerator && res.value ){
                            ind.position = res.numerator;
                            ind.value = res.value;
                            $scope.model.indicatorValuesById[res.numerator] = ind;
                        }
                    });

                    angular.forEach($scope.model.selectedProgram.programSections, function(sec){
                        var atts = [];
                        angular.forEach(sec.trackedEntityAttributes, function(att){
                            atts.push( att );
                            var indVal = $scope.model.indicatorValuesById[att.id];
                            if ( indVal ){
                                atts.push({id: att.id, displayName: indVal.displayName, isIndicator: true, value: indVal.value});
                            }
                        });
                        sec.trackedEntityAttributes = atts;
                    });

                    //Get BAC
                    var atvs = $scope.model.selectedProject.attributes;
                    var bacv = '';
                    if ( atvs && atvs.length > 0 ){
                        angular.forEach(atvs, function(atv){
                            if( atv.attribute === $scope.model.bac.id ){
                                bacv = atv.value;
                            }
                        });
                    }

                    var tpBsv = 56.4, cpBsv = 84.6;
                    var tpEvWeight = 2, tpPvWeight = 9, cpEvWeight = 1;

                    //Get AC
                    var en = $scope.model.selectedProject.enrollments[0];
                    var tpBac = {KPI: 'BAC', IND: $scope.model.bac.displayName, INT: $translate.instant('original_project_budget'), UNI: 'Bn UGX', BSL: bacv, qvs: []};
                    var tpAc = {KPI: 'AC', IND: $translate.instant('ac'), INT: $scope.model.ac.displayName, UNI: 'Bn UGX', BSL: tpBsv, qvs: []};
                    var tpEv = {KPI: 'EV', IND: $translate.instant('ev'), INT: $translate.instant('approved_budget_for_performed_project_activities'), UNI: 'Bn UGX', BSL: parseFloat( (tpEvWeight / 10) * bacv ).toFixed(2), qvs: []};
                    var tpPv = {KPI: 'PV', IND: $translate.instant('pv'), INT: $translate.instant('estimated_cost_of_planned_project_activities'), UNI: 'Bn UGX', BSL: parseFloat( (tpPvWeight / 10) * bacv ).toFixed(2), qvs: []};
                    var tpSpi = {KPI: 'SPI', IND: $translate.instant('spi'), INT: $translate.instant('project_progress_vs_schedule'), UNI: '0.01 - 1.00', BSL: parseFloat(tpEv.BSL / tpPv.BSL).toFixed(2), qvs: []};
                    var tpSv = {KPI: 'SV',  IND: $translate.instant('sv'),  INT: $translate.instant('sv_shows_if_project_is_ahead_or_behind_schedule'),  UNI: 'Bn UGX (+ve or -ve)', BSL: tpEv.BSL - tpPv.BSL, qvs: []};


                    var cpBac = {KPI: 'BAC', IND: $scope.model.bac.displayName, INT: $translate.instant('original_project_budget'), UNI: 'Bn UGX', BSL: bacv, qvs: []};
                    var cpAc = {KPI: 'AC', IND: $translate.instant('ac'), INT: $scope.model.ac.displayName, UNI: 'Bn UGX', BSL: cpBsv, qvs: []};
                    var cpEv = {KPI: 'EV', IND: $translate.instant('ev'), INT: $translate.instant('approved_budget_for_performed_project_activities'), UNI: 'Bn UGX', BSL: parseFloat( (cpEvWeight / 10) * bacv ).toFixed(2), qvs: []};
                    var cpCpi = {KPI: 'CPI', IND: $translate.instant('cpi'), INT: $translate.instant('value_of_work_completed_vs_actual_expenditure'), UNI: '0.01 - 1.00', BSL: parseFloat( cpEv.BSL / cpAc.BSL ).toFixed(2), qvs: []};
                    var cpCv = {KPI: 'CV', IND: $translate.instant('cv'), INT: $translate.instant('cv_shows_whether_the_project_is_over_or_under_budget'), UNI: 'Bn UGX (+ve or -ve)', BSL: parseFloat( cpEv.BSL - cpAc.BSL ).toFixed(2), qvs: []};
                    var cpEac = {KPI: 'EAC', IND: $translate.instant('eac'), INT: $translate.instant('expected_total_cost_of_completing_all_work'), UNI: 'Bn UGX', BSL: parseFloat(cpBsv / (cpEvWeight / 10)).toFixed(2), qvs: []};
                    var cpEtc = {KPI: 'ETC',  IND: $translate.instant('etc'),  INT: $translate.instant('expected_cost_required_to_complete_the_remaining_project_work'),  UNI: 'Bn UGX', BSL: parseFloat(cpEac.BSL - cpAc.BSL).toFixed(2), qvs: []};

                    if( en && en.events && en.events.length > 0){
                        var index = 1;
                        angular.forEach(en.events, function(ev){
                            angular.forEach(ev.dataValues, function(dv){
                                if( dv.dataElement === $scope.model.ac.id ){

                                    //Calcuate time performance values
                                    var tpEvVal = parseFloat( ((tpEvWeight + index) / 10) * bacv ).toFixed(2);
                                    var tpPvVal = parseFloat( ((tpPvWeight - index) / 10) * bacv ).toFixed(2);

                                    tpBac.qvs.push( bacv );
                                    tpAc.qvs.push( dv.value );
                                    tpEv.qvs.push( parseFloat(tpEvVal).toFixed(2) );
                                    tpPv.qvs.push( parseFloat(tpPvVal).toFixed(2) );
                                    tpSpi.qvs.push( parseFloat(tpEvVal / tpPvVal).toFixed(2) );
                                    tpSv.qvs.push( parseFloat(tpEvVal - tpPvVal).toFixed(2) );

                                    //Calculate cost performance values
                                    var cpEvVal = parseFloat( ((cpEvWeight + index) / 10) * bacv ).toFixed(2);
                                    var cpCpiVal = parseFloat( cpEvVal / dv.value ).toFixed(2);
                                    var cpCvVal = parseFloat( cpEvVal - dv.value ).toFixed(2);
                                    //var cpEacVal = parseFloat( bacv / cpCpiVal ).toFixed(2);
                                    var cpEacVal = parseFloat(dv.value / ((cpEvWeight + index)/ 10)).toFixed(2);
                                    var cpEtcVal = parseFloat( cpEacVal - dv.value ).toFixed(2);

                                    cpBac.qvs.push( bacv );
                                    cpAc.qvs.push( dv.value );
                                    cpEv.qvs.push( cpEvVal );
                                    cpCpi.qvs.push( cpCpiVal );
                                    cpCv.qvs.push( cpCvVal );
                                    cpEac.qvs.push( cpEacVal );
                                    cpEtc.qvs.push( cpEtcVal );
                                }
                            });
                            index++;
                        });

                        $scope.model.timePerformance = [tpBac, tpAc, tpEv, tpPv, tpSpi, tpSv];
                        $scope.model.costPerformance = [cpBac, cpAc, cpEv, cpCpi, cpCv, cpEac, cpEtc];
                    }
                });
            }
        }
    };

    $scope.resetData = function(){
        $scope.model.attributesById = [];
        $scope.model.dataElementsById = [];
        $scope.model.projectsFetched = false;
        $scope.model.projects = [];
    };

    $scope.resetView = function(horizontalMenu, e){
        $scope.model.activeHorizontalMenu = horizontalMenu;
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
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
                },
                validOrgUnits: function(){
                    return null;
                }
            }
        });

        modalInstance.result.then(function ( selectedOu ) {
            if( selectedOu && selectedOu.id ){
                $scope.selectedOrgUnit = selectedOu;
            }
        });
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = $scope.model.selectedProgram.displayName + " - project status" + " .xls";
        if( name ){
            reportName = name + ' performance.xls';
        }
        saveAs(blob, reportName);
    };
});