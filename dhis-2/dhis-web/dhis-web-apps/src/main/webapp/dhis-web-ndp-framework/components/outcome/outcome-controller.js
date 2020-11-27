/* Controllers */

/* global ndpFramework */


ndpFramework.controller('OutcomeController',
    function($scope,
        $translate,
        $modal,
        $filter,
        orderByFilter,
        NotificationService,
        SelectedMenuService,
        PeriodService,
        MetaDataFactory,
        OrgUnitFactory,
        OptionComboService,
        Analytics,
        FinancialDataService) {

    $scope.showReportFilters = false;

    $scope.model = {
        metaDataCached: false,
        data: null,
        dataElements: [],
        dataElementsById: [],
        kra: [],
        objectives: [],
        selectedKra: null,
        selectedObjective: null,
        selectedDataElementGroupSets: [],
        dataElementGroups: [],
        baseLineTargetActualDimensions: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: [],
        dictionaryItems: [],
        selectedPeriods: [],
        periods: [],
        allPeriods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        groupSetSize: {},
        physicalPerformance: true,
        financialPerformance: true,
        showProjectDetails: false
    };

    $scope.model.horizontalMenus = [
        {id: 'result', title: 'results', order: 1, view: 'components/outcome/results.html', active: true, class: 'main-horizontal-menu'},
        {id: 'performance', title: 'physical_performance', order: 2, view: 'components/outcome/performance.html', class: 'main-horizontal-menu'},
        {id: 'cumulative', title: 'cumulative_progress', order: 3, view: 'components/outcome/progress.html', class: 'main-horizontal-menu'},
        {id: 'cost', title: 'cost', order: 4, view: 'components/outcome/cost.html', class: 'main-horizontal-menu'},
        {id: 'efficiency', title: 'cost_effectiveness', order: 5, view: 'components/outcome/efficiency.html', class: 'main-horizontal-menu'},
        {id: 'dashboard', title: 'dashboard', order: 6, view: 'components/outcome/dashboard.html', class: 'external-horizontal-menu'},
        {id: 'library', title: 'library', order: 7, view: 'components/outcome/library.html', class: 'external-horizontal-menu'}
    ];

    $scope.$watch('model.selectedObjective', function(){
        $scope.model.selectedKra = null;
        $scope.model.kras = [];
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedObjective) && $scope.model.selectedObjective.id){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {id: $scope.model.selectedObjective.id});
            angular.forEach($scope.model.selectedObjective.dataElementGroups, function(deg){
                var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                if ( _deg.length > 0 ){
                    $scope.model.dataElementGroup.push( _deg[0] );
                }
            });

            $scope.model.kras = $scope.model.selectedObjective.dataElementGroups;
        }
        else{
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.objectives );
            angular.forEach($scope.model.objectives, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                    console.log('_deg:  ', _deg);
                    if ( _deg.length > 0 ){
                        $scope.model.dataElementGroup.push( _deg[0] );
                    }
                });
            });
        }
    });

    $scope.$on('MENU', function(){
        $scope.populateMenu();
    });

    $scope.$watch('model.selectedKra', function(){
        $scope.resetDataView();
        $scope.model.dataElementGroup = [];
        if( angular.isObject($scope.model.selectedKra) && $scope.model.selectedKra.id){
            var _deg = $filter('filter')($scope.model.dataElementGroups, {id: $scope.model.selectedKra.id});
            if ( _deg.length > 0 ){
                $scope.model.dataElementGroup.push( _deg[0] );
            }
            $scope.getAnalyticsData();
        }
        else{
            $scope.getObjectives();
        }
    });

    $scope.getBasePeriod = function(){
        $scope.model.basePeriod = null;
        var location = -1;

        var getBase = function(){
            $scope.model.selectedPeriods = orderByFilter( $scope.model.selectedPeriods, '-id').reverse();
            var p = $scope.model.selectedPeriods[0];
            var res = PeriodService.getPreviousPeriod( p.id, $scope.model.allPeriods );
            $scope.model.basePeriod = res.period;
            location = res.location;
        };

        getBase();

        if( location === 0 ){
            $scope.getPeriods('PREV');
            getBase();
        }
    };

    $scope.getObjectives = function(){
        $scope.model.dataElementGroup = [];
        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            angular.forEach(degs.dataElementGroups, function(deg){
                var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                if ( _deg.length > 0 ){
                    $scope.model.dataElementGroup.push( _deg[0] );
                }
            });
        });
    };

    OptionComboService.getBtaDimensions().then(function( bta ){

        if( !bta || !bta.category || !bta.options || bta.options.length !== 3 ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_bta_dimensions"));
            return;
        }

        $scope.model.bta = bta;
        $scope.model.baseLineTargetActualDimensions = $.map($scope.model.bta.options, function(d){return d.id;});

        MetaDataFactory.getAll('dataElements').then(function(dataElements){

            $scope.model.dataElementsById = dataElements.reduce( function(map, obj){
                map[obj.id] = obj;
                return map;
            }, {});

            MetaDataFactory.getDataElementGroups().then(function(dataElementGroups){

                $scope.model.dataElementGroups = dataElementGroups;

                MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){

                    $scope.model.dataElementGroupSets = dataElementGroupSets;

                    var periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
                    $scope.model.allPeriods = angular.copy( periods );
                    $scope.model.periods = periods;

                    var selectedPeriodNames = ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];

                    angular.forEach($scope.model.periods, function(pe){
                        if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                           $scope.model.selectedPeriods.push(pe);
                        }
                    });

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

                        $scope.populateMenu();
                    });
                });
            });
        });
    });

    $scope.populateMenu = function(){

        $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();
        $scope.model.selectedObjective = null;
        $scope.model.selectedKra = null;
        $scope.model.objectives = [];
        $scope.model.selectedDataElementGroupSets = [];

        if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){
            $scope.model.objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: $scope.model.selectedMenu.code}, true);

            $scope.model.objectives = orderByFilter( $scope.model.objectives, '-displayName').reverse();

            var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'goal'}, true);

            if( goals.length > 0 ){
                $scope.model.objectives.splice(0,0, ...goals);
            }

            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.objectives );

            if( $scope.model.objectives && $scope.model.objectives.length === 1 ){
                $scope.model.selectedObjective = $scope.model.objectives[0];
            }
            else{
                $scope.getObjectives();
            }
        }
    };

    $scope.getPeriods = function(mode){
        var periods = [];
        if( mode === 'NXT'){
            $scope.model.periodOffset = $scope.model.periodOffset + 1;
            periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }
        else{
            $scope.model.periodOffset = $scope.model.periodOffset - 1;
            periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
        }

        var periodsById = {};
        angular.forEach($scope.model.periods, function(p){
            periodsById[p.id] = p;
        });

        angular.forEach(periods, function(p){
            if( !periodsById[p.id] ){
                periodsById[p.id] = p;
            }
        });

        $scope.model.periods = Object.values( periodsById );

        $scope.model.allPeriods = angular.copy( $scope.model.periods );
    };

    $scope.getAnalyticsData = function(){

        $scope.model.data = null;
        var analyticsUrl = '';

        if( !$scope.selectedOrgUnit || !$scope.selectedOrgUnit.id ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_vote"));
            return;
        }

        if( !$scope.model.dataElementGroup || $scope.model.dataElementGroup.length === 0){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_objective_goal"));
            return;
        }

        $scope.getBasePeriod();

        if ( !$scope.model.basePeriod || !$scope.model.basePeriod.id ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_base_period"));
            return;
        }

        if( $scope.model.dataElementGroup && $scope.model.dataElementGroup.length > 0 && $scope.model.selectedPeriods.length > 0){
            analyticsUrl += '&filter=ou:'+ $scope.selectedOrgUnit.id +'&displayProperty=NAME&includeMetadataDetails=true';
            analyticsUrl += '&dimension=co&dimension=' + $scope.model.bta.category + ':' + $.map($scope.model.baseLineTargetActualDimensions, function(dm){return dm;}).join(';');
            analyticsUrl += '&dimension=pe:' + $.map($scope.model.selectedPeriods.concat( $scope.model.basePeriod ), function(pe){return pe.id;}).join(';');

            var des = [];
            angular.forEach($scope.model.dataElementGroup, function(deg){
                angular.forEach(deg.dataElements, function(de){
                    des.push( de.id );
                });
            });

            analyticsUrl += '&dimension=dx:' + des.join(';');

            FinancialDataService.getLocalData('data/cost.json').then(function(cost){
                $scope.model.cost = cost;

                Analytics.getData( analyticsUrl ).then(function(data){
                    if( data && data.data && data.metaData ){
                        $scope.model.data = data.data;
                        $scope.model.metaData = data.metaData;
                        $scope.model.reportReady = true;
                        $scope.model.reportStarted = false;

                        var dataParams = {
                            data: data.data,
                            metaData: data.metaData,
                            reportPeriods: angular.copy( $scope.model.selectedPeriods ),
                            bta: $scope.model.bta,
                            selectedDataElementGroupSets: $scope.model.selectedDataElementGroupSets,
                            selectedDataElementGroup: $scope.model.selectedKra,
                            dataElementGroups: $scope.model.dataElementGroups,
                            basePeriod: $scope.model.basePeriod,
                            maxPeriod: $scope.model.selectedPeriods.slice(-1)[0],
                            allPeriods: $scope.model.allPeriods,
                            dataElementsById: $scope.model.dataElementsById,
                            cost: $scope.model.cost
                        };

                        var processedData = Analytics.processData( dataParams );

                        $scope.model.dataHeaders = processedData.dataHeaders;
                        $scope.model.reportPeriods = processedData.reportPeriods;
                        $scope.model.dataExists = processedData.dataExists;
                        $scope.model.resultData = processedData.resultData || [];
                        $scope.model.performanceData = processedData.performanceData || [];
                        $scope.model.cumulativeData = processedData.cumulativeData || [];
                        $scope.model.costData = processedData.costData || [];
                        $scope.model.costEffData = processedData.costEffData || [];
                    }
                });
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

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = $scope.model.selectedObjective.ndp + " objective" + " .xls";
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

    $scope.getDataValueExplanation = function(dataElementId, periodId){
        var modalInstance = $modal.open({
            templateUrl: 'components/explanation/explanation-modal.html',
            controller: 'DataValueExplanationController',
            resolve: {
                dataElement: function(){
                    return dataElementId;
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
