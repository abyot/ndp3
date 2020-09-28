/* Controllers */

/* global ndpFramework */

ndpFramework.controller('ProgrammeController', 
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
        Analytics) {
    
    $scope.model = {
        metaDataCached: false,
        data: null,
        reportReady: false,
        dataExists: false,
        dataHeaders: [],
        optionSetsById: [],
        optionSets: [],
        objectives: [],
        ndpObjectives: [],
        ndpProgrammes: [],
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
        {id: 'performance', title: 'ndp_results', order: 1, view: 'components/programme/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 2, view: 'components/programme/dashboard.html'},
        {id: 'library', title: 'library', order: 3, view: 'components/programme/library.html'}
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
    
        MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){

            $scope.model.dataElementGroups = dataElementGroups;

            MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){

                $scope.model.dataElementGroupSets = dataElementGroupSets;
                
                $scope.model.periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);

                var selectedPeriodNames = ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];

                angular.forEach($scope.model.periods, function(pe){
                    if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                       $scope.model.selectedPeriods.push(pe);
                    } 
                });

                $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

                if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){

                    $scope.model.ndpProgram = $filter('filter')($scope.model.optionSets, {ndp: $scope.model.selectedMenu.ndp, code: 'program'}, true)[0];
                    $scope.model.ndpObjectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'objective'}, true);
                    $scope.model.ndpProgrammes = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'programme'}, true);
                    
                    $scope.model.ndpObjectives = $scope.model.ndpObjectives.filter(function(obj){
                        return !obj.ndpProgramme;
                    });
                }

                $scope.model.baseLineTargetActualDimensions = ['bqIaasqpTas', 'Px8Lqkxy2si', 'HKtncMjp06U'];

            });
        });
    
    });
        
    $scope.setNdpProgram = function( program ){
        if( $scope.model.selectedNdpProgram && $scope.model.selectedNdpProgram.id === program.id ){
            $scope.model.selectedNdpProgram = null;
        }
        else{
            $scope.model.selectedNdpProgram = program; 
        }
        
        if( $scope.model.selectedNdpProgram && $scope.model.selectedNdpProgram.code ){
            $scope.model.objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: $scope.model.selectedMenu.code, ndpProgramme: $scope.model.selectedNdpProgram.code}, true);            
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.objectives );
            $scope.getObjectives();
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
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_objective"));
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
                },
                validOrgUnits: function(){
                    return null;
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

        var reportName = $scope.model.selectedNdpProgram.displayName + " - objectives" + " .xls";
        if( name ){
            reportName = name + ' performance.xls';
        }
        saveAs(blob, reportName);
    };
    
    $scope.getIndicatorDictionary = function(item) {        
        var modalInstance = $modal.open({
            templateUrl: 'components/dictionary/details-modal.html',
            controller: 'DictionaryDetailsController',
            resolve: {
                dictionaryItem: function(){
                    return item;
                }
            }
        });

        modalInstance.result.then(function () {            
            
        });
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };
    
});