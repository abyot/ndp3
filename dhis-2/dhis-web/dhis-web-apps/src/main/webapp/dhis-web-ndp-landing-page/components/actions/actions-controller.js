/* Controllers */

/* global ndpFramework */

ndpFramework.controller('ActionsController',
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
        Analytics) {

    $scope.model = {
        metaDataCached: false,
        data: null,
        reportReady: false,
        dataExists: false,
        dataHeaders: [],
        dataElementsById: [],
        optionSetsById: [],
        optionSets: [],
        objectives: [],
        ndpObjectives: [],
        ndpProgrammes: [],
        dataElementGroup: [],
        selectedDataElementGroupSets: [],
        dataElementGroups: [],
        selectedNdpProgram: null,
        selectedSubProgramme: null,
        selectedPeriods: [],
        periods: [],
        allPeriods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly'
    };

    $scope.model.horizontalMenus = [
        {id: 'result', title: 'results', order: 1, view: 'components/actions/results.html', active: true, class: 'main-horizontal-menu'}
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

    $scope.getOutputs = function(){

        $scope.model.selectedDataElementGroupSets = $scope.model.selectedDataElementGroupSets.filter(function(obj){
            return obj.dataElementGroups && obj.dataElementGroups.length && obj.dataElementGroups.length > 0;
        });

        $scope.model.dataElementGroup = [];
        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            angular.forEach(degs.dataElementGroups, function(deg){
                var _deg = $filter('filter')($scope.model.dataElementGroups, {indicatorGroupType: 'output', id: deg.id}, true);
                if ( _deg.length > 0 ){
                    $scope.model.dataElementGroup.push( _deg[0] );
                }
            });
        });
    };

    $scope.$watch('model.selectedNdpProgram', function(){
        $scope.resetDataView();
        $scope.model.interventions = [];
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.subPrograms = [];
        $scope.model.selectedSubProgramme = null;
        if( angular.isObject($scope.model.selectedNdpProgram) ){
            if( $scope.model.selectedNdpProgram && $scope.model.selectedNdpProgram.code ){
                $scope.model.interventions = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: $scope.model.selectedMenu.code, ndpProgramme: $scope.model.selectedNdpProgram.code}, true);
                $scope.model.subPrograms = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'sub-programme', ndpProgramme: $scope.model.selectedNdpProgram.code}, true);
                $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, ndpProgramme: $scope.model.selectedNdpProgram.code, indicatorGroupSetType: $scope.model.selectedMenu.code}, true);
                $scope.getOutputs();
            }
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

    MetaDataFactory.getAll('optionSets').then(function(optionSets){

        $scope.model.optionSets = optionSets;

        angular.forEach(optionSets, function(optionSet){
            $scope.model.optionSetsById[optionSet.id] = optionSet;
        });

        $scope.model.ndp = $filter('getFirst')($scope.model.optionSets, {code: 'ndp'});

        if( !$scope.model.ndp || !$scope.model.ndp.code ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_ndp_configuration"));
            return;
        }

        OptionComboService.getBtaDimensions().then(function( bta ){

            if( !bta || !bta.category || !bta.options || bta.options.length !== 3 ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_bta_dimensions"));
                return;
            }

            $scope.model.bta = bta;
            $scope.model.baseLineTargetActualDimensions = $.map($scope.model.bta.options, function(d){return d.id;});
            $scope.model.actualDimension = null;
            $scope.model.targetDimension = null;
            angular.forEach(bta.options, function(op){
                if ( op.btaDimensionType === 'actual' ){
                    $scope.model.actualDimension = op;
                }
                if ( op.btaDimensionType === 'target' ){
                    $scope.model.targetDimension = op;
                }
            });

            MetaDataFactory.getAll('dataElements').then(function(dataElements){

                $scope.model.dataElementsById = dataElements.reduce( function(map, obj){
                    map[obj.id] = obj;
                    return map;
                }, {});

                MetaDataFactory.getDataElementGroups().then(function(dataElementGroups){

                    $scope.model.dataElementGroups = dataElementGroups;
                    $scope.model.allActions = $filter('filter')($scope.model.dataElementGroups, {indicatorGroupType: 'action'}, true);

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

                        $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

                        if( $scope.model.selectedMenu && $scope.model.selectedMenu.ndp && $scope.model.selectedMenu.code ){
                            $scope.model.ndpProgram = $filter('getFirst')($scope.model.optionSets, {ndp: $scope.model.selectedMenu.ndp, isNDPProgramme: true}, true);
                            $scope.model.ndpObjectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'resultsFrameworkObjective'}, true);
                            $scope.model.ndpProgrammes = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: 'programme'}, true);

                            $scope.model.ndpObjectives = $scope.model.ndpObjectives.filter(function(obj){
                                return !obj.ndpProgramme;
                            });
                        }
                    });
                });
            });

        });
    });

    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
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

    $scope.getActions = function( code ){
        var actions = [];
        angular.forEach($scope.model.allActions, function(ac){
            if( ac.code && ac.code.startsWith(code) ){
                actions.push( ac );
            }
        });
        return actions;
    };

    $scope.getAnalyticsData = function(){

        $scope.model.data = null;
        var analyticsUrl = '';

        if( !$scope.selectedOrgUnit || !$scope.selectedOrgUnit.id ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_vote"));
            return;
        }

        if( $scope.model.dataElementGroup.length === 0 || !$scope.model.dataElementGroup ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_output"));
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
            $scope.model.selectedActions = [];
            $scope.model.actionsByDataElement = [];
            angular.forEach($scope.model.dataElementGroup, function(deg){
                angular.forEach(deg.dataElements, function(de){
                    if( de.code ){
                        var ac = $scope.getActions( de.code );
                        if ( ac.length > 0 ){
                            $scope.model.actionsByDataElement[de.id] = ac;
                            $scope.model.selectedActions = $scope.model.selectedActions.concat( ac );
                        }
                    }
                    des.push( de.id );
                });
            });

            analyticsUrl += '&dimension=dx:' + des.join(';');

            var actionAnalyticsUrl = '&filter=ou:'+ $scope.selectedOrgUnit.id +'&displayProperty=NAME&includeMetadataDetails=true';
            actionAnalyticsUrl += '&dimension=pe:' + $.map($scope.model.selectedPeriods, function(pe){return pe.id;}).join(';');
            var acs = [];
            var actionDataExists = false;
            angular.forEach($scope.model.selectedActions, function(deg){
                angular.forEach(deg.dataElements, function(de){
                    actionDataExists = true;
                    acs.push( de.id );
                });
            });
            actionAnalyticsUrl += '&dimension=dx:' + acs.join(';');

            if ( !actionDataExists ){
                actionAnalyticsUrl = null;
            }

            Analytics.getData( actionAnalyticsUrl ).then(function(actionData){
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
                            actualDimension: $scope.model.actualDimension,
                            targetDimension: $scope.model.targetDimension,
                            selectedDataElementGroupSets: $scope.model.selectedDataElementGroupSets,
                            selectedDataElementGroup: $scope.model.selectedKra,
                            dataElementGroups: $scope.model.dataElementGroups,
                            basePeriod: $scope.model.basePeriod,
                            maxPeriod: $scope.model.selectedPeriods.slice(-1)[0],
                            allPeriods: $scope.model.allPeriods,
                            dataElementsById: $scope.model.dataElementsById,
                            displayActionData: true,
                            actionsByDataElement: $scope.model.actionsByDataElement,
                            actionData: actionData && actionData.data ? actionData.data : null,
                            actionMetaData: actionData && actionData.metaData ? actionData.metaData : null
                        };

                        var processedData = Analytics.processData( dataParams );

                        $scope.model.dataHeaders = processedData.dataHeaders;
                        $scope.model.reportPeriods = processedData.reportPeriods;
                        $scope.model.dataExists = processedData.dataExists;
                        $scope.model.resultData = processedData.resultData || [];
                        $scope.model.performanceData = processedData.performanceData || [];
                        $scope.model.cumulativeData = processedData.cumulativeData || [];
                        $scope.model.hasPhysicalPerformanceData = processedData.hasPhysicalPerformanceData;
                        $scope.model.actionData = processedData.actionCost;
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