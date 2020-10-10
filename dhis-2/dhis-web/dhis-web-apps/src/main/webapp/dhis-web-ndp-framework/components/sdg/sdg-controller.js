/* Controllers */

/* global ndpFramework */


ndpFramework.controller('SDGController',
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
        OptionComboService,
        Analytics) {

    $scope.model = {
        metaDataCached: false,
        data: null,
        dataElements: [],
        dataElementsById: [],
        kra: [],
        sdgGoals: [],
        selectedSdgTarget: null,
        selectedSdgGoal: null,
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
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        groupSetSize: {},
        physicalPerformance: true,
        financialPerformance: true,
        showProjectDetails: false
    };

    $scope.model.horizontalMenus = [
        {id: 'performance', title: 'sdg_results', order: 3, view: 'components/sdg/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 4, view: 'components/sdg/dashboard.html'},
        {id: 'library', title: 'library', order: 1, view: 'components/sdg/library.html'}
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

    $scope.$watch('model.selectedSdgGoal', function(){
        $scope.model.selectedSdgTarget = null;
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedSdgGoal) && $scope.model.selectedSdgGoal.id){

            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {id: $scope.model.selectedSdgGoal.id});
            angular.forEach($scope.model.selectedSdgGoal.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });

        }
        /*else{
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.sdgGoals );
            angular.forEach($scope.model.sdgGoals, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }*/
    });

    $scope.$watch('model.selectedSdgTarget', function(){
        $scope.resetDataView();
        $scope.model.dataElementGroup = [];
        if( angular.isObject($scope.model.selectedSdgTarget) && $scope.model.selectedSdgTarget.id){
            $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: $scope.model.selectedSdgTarget.id})[0] );
            $scope.getAnalyticsData();
        }
        else{
            $scope.getSdgs();
        }
    });

    $scope.getSdgs = function(){
        $scope.model.dataElementGroup = [];
        angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
            angular.forEach(degs.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        });
    };

    $scope.setSdgGoal = function( goal ){
        if( $scope.model.selectedSdgGoal && $scope.model.selectedSdgGoal.id === goal.id ){
            $scope.model.selectedSdgGoal = null;
        }
        else{
            $scope.model.selectedSdgGoal = goal;
        }

        /*if( $scope.model.selectedSdgGoal ){
            $scope.model.objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedMenu.ndp, indicatorGroupSetType: $scope.model.selectedMenu.code, ndpProgramme: $scope.model.selectedNdpProgram.code}, true);
            $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.objectives );
            $scope.getObjectives();
        }*/

    };

    OptionComboService.getBtaDimensions().then(function( bta ){

        if( !bta || !bta.category || !bta.options || bta.options.length !== 3 ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_bta_dimensions"));
            return;
        }

        $scope.model.bta = bta;
        $scope.model.baseLineTargetActualDimensions = $.map($scope.model.bta.options, function(d){return d.id;});

        MetaDataFactory.getDataElementGroups().then(function(dataElementGroups){

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

                if( $scope.model.selectedMenu && $scope.model.selectedMenu.id && $scope.model.selectedMenu.id === 'SDG'){
                    var ctxt = $scope.model.selectedMenu.id.toLowerCase();
                    $scope.model.sdgGoals = [];
                    angular.forEach($scope.model.dataElementGroupSets, function(degs){
                        if( degs.indicatorGroupSetType === ctxt && degs.code.indexOf('sdg_') !== -1 ){
                            var obj = degs;
                            if( degs.code.indexOf('sdg_') !== -1 ){
                                obj.order = parseInt( degs.code.substring(4, degs.code.length) );
                            }
                            $scope.model.sdgGoals.push( obj );
                        }
                    });

                    $scope.model.sdgGoals = orderByFilter( $scope.model.sdgGoals, '-order').reverse();
                    $scope.model.selectedDataElementGroupSets = angular.copy( $scope.model.sdgGoals );
                    if( $scope.model.sdgGoals && $scope.model.sdgGoals.length === 1 ){
                        $scope.model.selectedSdgGoal = $scope.model.sdgGoals[0];
                    }
                    else{
                        $scope.getSdgs();
                    }
                }
            });
        });
    });

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
        //Todo
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

        var reportName = $scope.model.selectedSdgGoal.ndp + " objective" + " .xls";
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