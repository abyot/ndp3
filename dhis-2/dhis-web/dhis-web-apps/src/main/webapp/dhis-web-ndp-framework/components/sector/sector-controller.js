/* Controllers */

/* global ndpFramework */


ndpFramework.controller('SectorController', 
        function($scope,
        $translate,
        $modal,
        $filter,
        NotificationService,
        SelectedMenuService,
        orderByFilter,
        PeriodService,
        MetaDataFactory,
        Analytics,
        OrgUnitGroupSetService) {
    
    $scope.model = {
        metaDataCached: false,
        data: null,
        reportReady: false,
        dataExists: false,
        dataHeaders: [],
        optionSetsById: [],
        optionSets: [],
        sectors: [],
        selectedSector: null,
        interventions: [],
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
        {id: 'performance', title: 'results', order: 3, view: 'components/sector/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 4, view: 'components/sector/dashboard.html'},
        {id: 'library', title: 'library', order: 1, view: 'components/sector/library.html'}
    ];
    
    $scope.$watch('model.selectedObjective', function(){
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( $scope.model.selectedObjective ){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {programObjective: $scope.model.selectedObjective});
            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }
        else{
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.interventions );
            angular.forEach($scope.model.interventions, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }
    });

    $scope.$watch('model.selectedIntervention', function(){
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedIntervention) && $scope.model.selectedIntervention.id){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {id: $scope.model.selectedIntervention.id});
            angular.forEach($scope.model.selectedIntervention.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        }
        else{
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.interventions );
            angular.forEach($scope.model.interventions, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }
    });
    
    OrgUnitGroupSetService.getSectors().then(function(sectors){
        $scope.model.sectors = sectors;
        
        MetaDataFactory.getAll('optionSets').then(function(optionSets){
        
            $scope.model.optionSets = optionSets;

            angular.forEach(optionSets, function(optionSet){
                $scope.model.optionSetsById[optionSet.id] = optionSet;
            });

            MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){

                $scope.model.dataElementGroups = dataElementGroups;

                MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){

                    $scope.model.dataElementGroupSets = dataElementGroupSets;
                    
                    $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

                    $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);

                    var selectedPeriodNames = ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];

                    angular.forEach($scope.model.periods, function(pe){
                        if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                           $scope.model.selectedPeriods.push(pe);
                        } 
                    });

                    $scope.model.baseLineTargetActualDimensions = ['bqIaasqpTas', 'Px8Lqkxy2si', 'HKtncMjp06U'];

                });
            });

        });
        
    });

    $scope.setSector = function( sector ){
        $scope.resetView();
        if( $scope.model.selectedSector && $scope.model.selectedSector.id === sector.id ){
            $scope.model.selectedSector = null;
        }
        else{
            $scope.model.selectedSector = sector; 
        }

        $scope.getInterventions();
    };
    
    $scope.getObjectives = function(){
        $scope.model.objectives = [];
        $scope.model.dataElementGroup = [];
        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            if ( degs.programObjective && $scope.model.objectives.indexOf(degs.programObjective) === -1 ){
                $scope.model.objectives.push( degs.programObjective );
            }
            angular.forEach(degs.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        });
    };    
    
    $scope.getInterventions = function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.objectives = [];
        $scope.model.dataElementGroup = [];
        
        if( $scope.model.selectedSector && $scope.model.selectedSector.organisationUnits.length > 0 ){
            var groupSetIds = [];
            var sectorOrgUnits = $scope.model.selectedSector.organisationUnits;
            
            angular.forEach(sectorOrgUnits, function(orgUnit){
                angular.forEach(orgUnit.dataSets,function(ds){
                    angular.forEach(ds.dataSetElements,function(dse){
                        angular.forEach(dse.dataElement.dataElementGroups,function(deg){
                            angular.forEach(deg.groupSets,function(degs){
                                if(groupSetIds.indexOf(degs.id) === -1 ){
                                    groupSetIds.push(degs.id);
                                }
                            });
                        });
                    });
                });
            });
            
            angular.forEach(groupSetIds,function(groupSetId){
                $scope.model.selectedDataElementGroupSets.push( $filter('filter')($scope.model.dataElementGroupSets, {id: groupSetId})[0] );
            });
            
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.selectedDataElementGroupSets, {indicatorGroupSetType: 'intervention'}, true);
            
            $scope.getObjectives();
            
            //var goals = $filter('filter')($scope.model.selectedDataElementGroupSets, {indicatorGroupSetType: 'goal'}, true);
            //var objectives = $filter('filter')($scope.model.selectedDataElementGroupSets, {indicatorGroupSetType: 'objective'}, true);
        }        
    };
    
    $scope.resetView = function(horizontalMenu){
        $scope.model.activeHorizontalMenu = horizontalMenu;
        $scope.model.dataElementGroup = [];
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.objectives = [];
        $scope.model.interventions = [];
        $scope.model.selectedIntervention = null;
        $scope.model.selectedObjective = null;
        $scope.resetDataView();
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };

    $scope.getPeriods = function(mode){
        if( mode === 'NXT'){
            $scope.model.periodOffset = $scope.model.periodOffset + 1;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }
        else{
            $scope.model.periodOffset = $scope.model.periodOffset - 1;
            $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }    
    };
    
    $scope.getAnalyticsData = function(){
        
        $scope.model.data = null;
        var analyticsUrl = '';
        
        if( !$scope.selectedOrgUnit || !$scope.selectedOrgUnit.id ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_vote"));
        }
        
        if( $scope.model.dataElementGroup.length === 0 || !$scope.model.dataElementGroup ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_invervention"));
        }
        
        if( $scope.model.dataElementGroup && $scope.model.dataElementGroup.length > 0 && $scope.model.selectedPeriods.length > 0){
            analyticsUrl += '&filter=ou:'+ $scope.selectedOrgUnit.id +'&displayProperty=NAME&includeMetadataDetails=true';
            analyticsUrl += '&dimension=Duw5yep8Vae:' + $.map($scope.model.baseLineTargetActualDimensions, function(dm){return dm;}).join(';');
            analyticsUrl += '&dimension=pe:' + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';');

            var des = [];
            angular.forEach($scope.model.dataElementGroup, function(deg){
                angular.forEach(deg.dataElements, function(de){
                    des.push( de.id );
                });
            });

            analyticsUrl += '&dimension=dx:' + des.join(';');

            Analytics.getData( analyticsUrl ).then(function(data){
                $scope.model.selectedPeriods = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();
                $scope.model.data = data.data;
                $scope.model.metaData = data.metaData;
                $scope.model.reportReady = true;
                $scope.model.reportStarted = false;
                $scope.model.dataHeaders = [];
                angular.forEach($scope.model.selectedPeriods, function(pe){
                    var colSpan = 0;
                    var d = $filter('filter')($scope.model.data, {pe: pe.id});
                    pe.hasData = d && d.length > 0;
                    angular.forEach($scope.model.baseLineTargetActualDimensions, function(dm){
                        var d = $filter('filter')($scope.model.data, {Duw5yep8Vae: dm, pe: pe.id});
                        if( d && d.length > 0 ){
                            colSpan++;
                            $scope.model.dataHeaders.push({periodId: pe.id, dimensionId: dm, dimension: 'Duw5yep8Vae'});
                        }
                    });                    
                    pe.colSpan = colSpan;
                });

                if( Object.keys( $scope.model.data ).length === 0 ){
                    $scope.model.dataExists = false;
                    return;
                }
                else{
                    $scope.model.dataExists = true;
                    $scope.model.finalData = [];
                    var currRow = [], parsedRow = [];

                    angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){                        
                        var groupSet = {val: degs.displayName, span: 0};
                        currRow.push(groupSet);
                        
                        var generateRow = function(group, deg){
                            angular.forEach(deg.dataElements, function(de){
                                groupSet.span++;
                                group.span++;

                                currRow.push({val: $scope.model.metaData.items[de.id].name, span: 1, info: de.id});
                                angular.forEach($scope.model.dataHeaders, function(dh){
                                    currRow.push({val: $scope.filterData(dh, de.id), span: 1});
                                });
                                parsedRow.push(currRow);
                                currRow = [];
                            });
                        };
                        
                        angular.forEach(degs.dataElementGroups, function(deg){
                            if( $scope.model.selectedKra && $scope.model.selectedKra.id ){
                                if ( deg.id === $scope.model.selectedKra.id ){
                                    var group = {val: deg.displayName, span: 0};
                                    currRow.push(group);
                                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0];
                                    generateRow(group, _deg);
                                }
                            }
                            else{
                                var group = {val: deg.displayName, span: 0};
                                currRow.push(group);
                                var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0];
                                generateRow(group, _deg);
                            }
                        });
                    });
                    $scope.model.finalData = parsedRow;
                }
            });
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
    
    $scope.filterData = function(header, dataElement){
        if(!header || !$scope.model.data || !header.periodId || !header.dimensionId || !dataElement) return;
        var res = $filter('filter')($scope.model.data, {dx: dataElement, Duw5yep8Vae: header.dimensionId, pe: header.periodId})[0];
        return res && res.value ? res.value : '';        
    };
    
    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = $scope.model.selectedNdpProgram.displayName + " - interventions" + " .xls";
        if( name ){
            reportName = name + ' performance.xls';
        }
        saveAs(blob, reportName);
    };
    
    $scope.getIndicatorDictionary = function(item) {        
        var modalInstance = $modal.open({
            templateUrl: 'components/dictionary/details-modal.html',
            controller: 'DictionaryController',
            resolve: {
                dictionaryItem: function(){
                    return item;
                }
            }
        });

        modalInstance.result.then(function () {            
            
        });
    };
});