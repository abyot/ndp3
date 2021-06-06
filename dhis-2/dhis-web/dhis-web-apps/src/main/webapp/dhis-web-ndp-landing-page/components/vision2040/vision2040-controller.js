/* Controllers */

/* global ndpFramework */


ndpFramework.controller('Vision2040Controller',
    function($scope,
        $translate,
        $modal,
        $filter,
        orderByFilter,
        SelectedMenuService,
        NotificationService,
        PeriodService,
        MetaDataFactory,
        OrgUnitFactory,
        DashboardService,
        OptionComboService,
        FinancialDataService,
        Analytics) {

    $scope.model = {
        metaDataCached: false,
        dataElements: [],
        dataElementsById: [],
        dataElementGroups: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: [],
        dictionaryItems: [],
        vision2040: [],
        charts: [],
        tables: [],
        maps: [],
        selectedPeriods: [],
        periods: [],
        allPeriods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly'
    };

    $scope.model.horizontalMenus = [
        {id: 'result', title: 'results', order: 1, view: 'components/vision2040/results.html', active: true, class: 'main-horizontal-menu'},
        {id: 'dashboard', title: 'dashboard', order: 6, view: 'views/dashboard.html', class: 'main-horizontal-menu'}
    ];

    OptionComboService.getBtaDimensions().then(function( bta ){

        if( !bta || !bta.category || !bta.options || bta.options.length !== 3 ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_bta_dimensions"));
            return;
        }

        $scope.model.bta = bta;
        $scope.model.targetDimension = $.map($scope.model.bta.options, function(d){
            if( d.btaDimensionType === 'target' ){
                return d.id;
            }
        });

        MetaDataFactory.getAll('categoryCombos').then(function(ccs){
            angular.forEach(ccs, function(cc){
                $scope.model.categoryCombosById[cc.id] = cc;
            });

            MetaDataFactory.getAll('dataElements').then(function(dataElements){

                $scope.model.dataElementsById = dataElements.reduce( function(map, obj){
                    map[obj.id] = obj;
                    return map;
                }, {});

                MetaDataFactory.getDataElementGroups().then(function(dataElementGroups){

                    $scope.model.downloadLabel = $translate.instant('download_visualization');
                    $scope.model.metaDataCached = true;

                    $scope.model.dataElementGroups = dataElementGroups;

                    MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){
                        $scope.model.dataElementGroupSets = dataElementGroupSets;

                        var periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
                        $scope.model.allPeriods = angular.copy( periods );
                        $scope.model.periods = periods;

                        var selectedPeriodNames = ['2024/25'];

                        angular.forEach($scope.model.periods, function(pe){
                            if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                               $scope.model.selectedPeriods.push(pe);
                            }
                        });

                        /*$scope.model.dashboardName = 'Vision2040';
                        DashboardService.getByName( $scope.model.dashboardName ).then(function( result ){
                            $scope.model.dashboardItems = result.dashboardItems;
                            $scope.model.charts = result.charts;
                            $scope.model.tables = result.tables;
                            $scope.model.maps = result.maps;
                            $scope.model.dashboardFetched = true;
                        });*/

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

                            $scope.getAnalyticsData();

                        });
                    });
                });
            });
        });
    });

    $scope.populateMenu = function(){

        $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();
        $scope.model.selectedGoal = null;
        $scope.model.selectedKra = null;
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.dataElementGroup = [];

        if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){
            var vision2040Targets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'vision2040'}, true);
            $scope.model.selectedDataElementGroupSets = angular.copy( vision2040Targets );
            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                    if ( _deg.length > 0 ){
                        $scope.model.dataElementGroup.push( _deg[0] );
                    }
                });
            });
        }
    };

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

    $scope.getAnalyticsData = function(){

        $scope.model.data = null;
        var analyticsUrl = '';

        if( !$scope.selectedOrgUnit || !$scope.selectedOrgUnit.id ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_vote"));
            return;
        }

        if( !$scope.model.dataElementGroup || $scope.model.dataElementGroup.length === 0){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_goal"));
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

            $scope.model.dataElements = [];
            angular.forEach($scope.model.dataElementGroup, function(deg){
                angular.forEach(deg.dataElements, function(de){
                    var _de = $scope.model.dataElementsById[de.id];
                    $scope.model.dataElements.push( _de );
                });
            });

            analyticsUrl += '&dimension=dx:' + $.map($scope.model.dataElements, function(de){return de.id;}).join(';');

            FinancialDataService.getLocalData('data/cost.json').then(function(cost){
                $scope.model.cost = cost;

                Analytics.getData( analyticsUrl ).then(function(data){
                    if( data && data.data && data.metaData ){
                        $scope.model.data = data.data;
                        $scope.model.metaData = data.metaData;
                        $scope.model.reportReady = true;
                        $scope.model.reportStarted = false;
                        console.log('data:  ', $scope.model.data);
                    }
                });
            });
        }
    };

    $scope.getTargetValue = function( dataElement, oc ){

        var filterParams = {
            dx: dataElement.id,
            pe: $scope.model.selectedPeriods[0].id,
            co: oc
        };

        console.log('fitlerr: ', filterParams);
        var res = $filter('dataFilter')($scope.model.data, filterParams);
        return res && res[0] && res[0].value ? res[0].value : '';
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName =$scope.model.selectedMenu.displayName + ".xls";

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

    $scope.getDataValueExplanation = function( item ){
        var modalInstance = $modal.open({
            templateUrl: 'components/explanation/explanation-modal.html',
            controller: 'DataValueExplanationController',
            windowClass: 'comment-modal-window',
            resolve: {
                item: function(){
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
