/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $modal,
                $translate,
                $filter,
                orderByFilter,
                SessionStorageService,
                SelectedMenuService,
                PeriodService,
                OptionComboService,
                NotificationService,
                FinancialDataService,
                Analytics,
                OrgUnitFactory,
                MetaDataFactory) {

    $scope.model = {
        metaDataCached: false,
        dataElementGroups: [],
        dataElementGroupSets: [],
        dataElementGroup: [],
        optionSets: [],
        optionSetsById: [],
        ndp: null,
        programs: [],
        selectedProgram: null,
        selectedPeriods: [],
        periods: [],
        allPeriods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly'
    };

    var start = new Date();
    dhis2.ndp.downloadMetaData().then(function(){
        var end = new Date();
        SessionStorageService.set('METADATA_CACHED', true);
        console.log('Finished loading metadata in about ', Math.floor((end - start) / 1000), ' - secs');

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
                MetaDataFactory.getAll('optionSets').then(function(optionSets){

                    $scope.model.optionSets = optionSets;

                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSetsById[optionSet.id] = optionSet;
                    });

                    var ndpOptions = $filter('filter')(optionSets, {code: 'ndp'});

                    if( ndpOptions && ndpOptions.length > 0 ){
                        $scope.model.ndp = angular.copy( ndpOptions[0] );
                    }

                    MetaDataFactory.getDataElementGroups().then(function( dataElementGroups ){
                        $scope.model.dataElementGroups = dataElementGroups;

                        MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroupSets){
                            $scope.model.dataElementGroupSets = dataElementGroupSets;

                            $scope.model.metaDataCached = true;

                            $scope.model.slides = [
                                {
                                    id: '1',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/1.jpg',
                                    background: 'bg-slide-1'
                                },
                                {
                                    id: '2',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/2.jpg',
                                    background: 'bg-slide-2'
                                },
                                {
                                    id: '3',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/3.jpg',
                                    background: 'bg-slide-3'
                                },
                                {
                                    id: '4',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/4.jpg',
                                    background: 'bg-slide-4'
                                },
                                {
                                    id: '5',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/5.jpg',
                                    background: 'bg-slide-5'
                                },
                                {
                                    id: '6',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/6.jpg',
                                    background: 'bg-slide-6'
                                },
                                {
                                    id: '7',
                                    type: 'IMG',
                                    heading: 'Header',
                                    description: 'Description',
                                    path: 'images/7.jpg',
                                    background: 'bg-slide-7'
                                }
                                /*{
                                    id: '1',
                                    type: 'TABLE',
                                    heading: $translate.instant('goal_slider_title')
                                },{
                                    id: '2',
                                    type: 'TEXT',
                                    heading: 'Slide 2',
                                    description: 'Slide 2 Description'
                                },{
                                    id: '3',
                                    type: 'IMG',
                                    heading: 'UGANDA',
                                    description: 'More about Map of Uganda 1',
                                    path: 'images/1200px-Flag-map_of_Uganda.svg.png'
                                },{
                                    id: '4',
                                    type: 'IMG',
                                    heading: 'UGANDA',
                                    description: 'More about Map of Uganda 2',
                                    path: 'images/logo_front.png'
                                }*/
                            ];

                            var periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
                            $scope.model.allPeriods = angular.copy( periods );
                            $scope.model.periods = periods;

                            var selectedPeriodNames = ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'];

                            angular.forEach($scope.model.periods, function(pe){
                                if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                                   $scope.model.selectedPeriods.push(pe);
                                }
                            });

                            var ndpMenus = [], order = 0;
                            angular.forEach($scope.model.ndp.options, function(op){
                                op.order = order;
                                order++;

                                var objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'resultsFrameworkObjective'}, true);
                                var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'goal'}, true);
                                var programs = $filter('filter')($scope.model.optionSets, {ndp: op.code, code: 'program'}, true);
                                //var sdgs = $filter('filter')($scope.model.dataElementGroupSets, {indicatorGroupSetType: 'sdgGoals'}, true);

                                op.children = [];

                                op.hasChildren = true;
                                op.show = true;

                                var hl = {
                                    id: op.code + '-HGH',
                                    order: 1,
                                    displayName: $translate.instant('high_level'),
                                    show: true,
                                    ndp: op.code,
                                    domain: 'HGH',
                                    hasChildren: true,
                                    children: [],
                                    color: 'ndp-menu'
                                };

                                op.children.push( hl );

                                hl.hasChildren = true;
                                hl.show = true;
                                hl.children.push( {
                                    id: op.code + '-VSN',
                                    domain: 'VSN',
                                    code: 'vision2040',
                                    ndp: op.code,
                                    order: 2,
                                    displayName: $translate.instant('vision_2040_targets'),
                                    children: [],
                                    view: 'components/vision2040/vision2040-status.html',
                                    color: 'ndp-menu'
                                })

                                if( goals.length > 0 ){


                                    hl.children.push( {
                                        id: op.code + '-GOL',
                                        domain: 'NOUT',
                                        code: 'resultsFrameworkObjective',
                                        ndp: op.code,
                                        order: 3,
                                        displayName: $translate.instant('goal_impact'),
                                        children: [],
                                        view: 'components/goal/goal-status.html',
                                        color: 'ndp-menu'
                                    } );

                                    $scope.model.selectedDataElementGroupSets = angular.copy( goals );
                                    angular.forEach(goals, function(degs){
                                        angular.forEach(degs.dataElementGroups, function(deg){
                                            var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id});
                                            if ( _deg.length > 0 ){
                                                $scope.model.dataElementGroup.push( _deg[0] );
                                            }
                                        });
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

                                        $scope.getAnalyticsData();

                                    });
                                }

                                if( objectives.length > 0 ){
                                    hl.hasChildren = true;
                                    hl.show = true;
                                    hl.children.push( {
                                        id: op.code + '-OBJ',
                                        domain: 'NOUT',
                                        code: 'resultsFrameworkObjective',
                                        ndp: op.code,
                                        order: 3,
                                        displayName: $translate.instant('objective_outcomes'),
                                        children: [],
                                        view: 'components/objective/objective-status.html',
                                        color: 'ndp-menu'
                                    } );
                                }

                                if( programs.length > 0 ){

                                    var pl = {
                                        id: op.code + '-PROGREAMME',
                                        order: 3,
                                        displayName: $translate.instant('programme_results'),
                                        show: true,
                                        ndp: op.code,
                                        domain: 'PRG',
                                        hasChildren: true,
                                        children: [],
                                        color: 'ndp-menu'
                                    };

                                    pl.hasChildren = true;
                                    pl.show = true;
                                    pl.children.push( {
                                        id: op.code + '-PRG',
                                        domain: 'PRGO',
                                        code: 'objective',
                                        ndp: op.code,
                                        order: 1,
                                        displayName: $translate.instant('outcome_level'),
                                        children: [],
                                        view: 'components/programme-outcome/programme-status.html',
                                        color: 'ndp-menu'
                                    } );

                                    op.children.push(pl);

                                    var sp = {
                                        id: op.code + '-SUB',
                                        order: 3,
                                        displayName: $translate.instant('sub_programme_results'),
                                        show: true,
                                        ndp: op.code,
                                        domain: 'PRG',
                                        hasChildren: true,
                                        children: [],
                                        color: 'ndp-menu'
                                    }

                                    sp.hasChildren = true;
                                    sp.show = true;
                                    sp.children.push( {
                                        id: op.code + '-SUB-OUTCOME',
                                        domain: 'SUB-OUTCOME',
                                        code: 'subProgrammeObjective',
                                        ndp: op.code,
                                        order: 2,
                                        displayName: $translate.instant('intermediate_outcomes'),
                                        children: [],
                                        view: 'components/sub-programme-outcome/sub-programme-outcome-status.html',
                                        color: 'ndp-menu'
                                    } );

                                    sp.children.push( {
                                        id: op.code + '-SUB-OUTPUT',
                                        domain: 'SUB',
                                        code: 'intervention',
                                        ndp: op.code,
                                        order: 3,
                                        displayName: $translate.instant('output_level'),
                                        show: true,
                                        view: 'components/sub-programme-output/sub-programme-output-status.html',
                                        children: [],
                                        color: 'ndp-menu'
                                    } );

                                    sp.children.push( {
                                        id: op.code + '-SUB-ACTION',
                                        domain: 'SUB',
                                        code: 'intervention',
                                        ndp: op.code,
                                        order: 3,
                                        displayName: $translate.instant('action_level'),
                                        show: true,
                                        view: 'components/actions/actions-status.html',
                                        children: [],
                                        color: 'ndp-menu'
                                    } );

                                    /*sp.children.push( {
                                        id: op.code + '-SUB-ITEM',
                                        domain: 'SUB',
                                        code: 'SUB-ITEM',
                                        ndp: op.code,
                                        order: 3,
                                        displayName: $translate.instant('item_level'),
                                        show: true,
                                        view: 'components/items/items-status.html',
                                        children: [],
                                        color: 'ndp-menu'
                                    } );*/

                                    op.hasChildren = true;
                                    op.show = true;
                                    op.children.push(sp);

                                    /*var pr = {
                                        id: op.code + '-PJ',
                                        order: 4,
                                        displayName: $translate.instant('project_tracker'),
                                        show: true,
                                        ndp: op.code,
                                        domain: 'PJ',
                                        hasChildren: true,
                                        children: []
                                    };

                                    pr.hasChildren = true;
                                    pr.show = true;
                                    pr.children.push({
                                        id: 'PRJP',
                                        domain: 'PRJP',
                                        displayName: $translate.instant('project_performance'),
                                        order: 1,
                                        children: [],
                                        view: 'components/project/performance.html'
                                    });

                                    op.children.push(pr);

                                    var il = {
                                        id: op.code + '-IL',
                                        order: 5,
                                        displayName: $translate.instant('institutional_results'),
                                        show: true,
                                        ndp: op.code,
                                        domain: 'IL',
                                        hasChildren: true,
                                        children: []
                                    };

                                    il.hasChildren = true;
                                    il.show = true;
                                    il.children.push(
                                            {
                                                id: 'MDA',
                                                domain: 'MDA',
                                                displayName: $translate.instant('mdas'),
                                                order: 1,
                                                children: [],
                                                view: 'components/mda/mda-status.html'
                                            },
                                            {
                                                id: 'LOG',
                                                domain: 'LOG',
                                                displayName: $translate.instant('lgs'),
                                                order: 2,
                                                children: [],
                                                view: 'components/log/log-status.html'
                                            },{
                                                id: 'LLG',
                                                domain: 'LLG',
                                                displayName: $translate.instant('llgs'),
                                                order: 2,
                                                children: [],
                                                view: 'components/log/log-status.html'
                                            }
                                    );

                                    op.children.push(il);*/
                                }

                                ndpMenus.push( op );
                            });

                            $scope.model.menuItems = [
                                {
                                    id: 'navigation',
                                    order: 0,
                                    displayName: $translate.instant('navigation'),
                                    root: true,
                                    show: true,

                                    children: [
                                        {
                                            id: 'NDP',
                                            domain: 'NDP',
                                            displayName: $translate.instant('ndp_results'),
                                            order: 1,
                                            children: ndpMenus,
                                            hasChildren: ndpMenus.length > 0 ? true : false,
                                            show: ndpMenus.length > 0 ? true : false,
                                            color: 'ndp-menu'
                                        },
                                        {
                                            id: 'SPACE',
                                            displayName: $translate.instant('space'),
                                            order: 2,
                                            children: []
                                        },
                                        {
                                            id: 'IL',
                                            domain: 'IL',
                                            order: 3,
                                            displayName: $translate.instant('institutional_results'),
                                            hasChildren: true,
                                            show: true,
                                            color: 'il-menu',
                                            children: [
                                            {
                                                id: 'MDA',
                                                domain: 'MDA',
                                                displayName: $translate.instant('mdas'),
                                                order: 1,
                                                children: [],
                                                view: 'components/mda/mda-status.html',
                                                color: 'il-menu'
                                            },
                                            {
                                                id: 'LOG',
                                                domain: 'LOG',
                                                displayName: $translate.instant('lgs'),
                                                order: 2,
                                                children: [],
                                                view: 'components/log/log-status.html',
                                                color: 'il-menu'
                                            },{
                                                id: 'LLG',
                                                domain: 'LLG',
                                                displayName: $translate.instant('llgs'),
                                                order: 3,
                                                children: [],
                                                view: 'components/llg/llg-status.html',
                                                color: 'il-menu'
                                            }
                                            ]
                                        },
                                        {
                                            id: 'SPACE',
                                            displayName: $translate.instant('space'),
                                            order: 4,
                                            children: []
                                        },
                                        {
                                            id: 'PRJP',
                                            domain: 'PRJP',
                                            code: 'projects',
                                            displayName: $translate.instant('project_tracker'),
                                            order: 5,
                                            children: [],
                                            view: 'components/project/performance.html',
                                            color: 'prj-menu'
                                        },
                                        {
                                            id: 'SPACE',
                                            displayName: $translate.instant('space'),
                                            order: 6,
                                            children: []
                                        },
                                        {
                                            id: 'SDG',
                                            domain: 'SDG',
                                            code: 'sdgGoals',
                                            displayName: $translate.instant('sdg_results'),
                                            order: 7,
                                            children: [],
                                            view: 'components/sdg/sdg-status.html',
                                            color: 'sdg-menu'
                                        },
                                        {
                                            id: 'SPACE',
                                            displayName: $translate.instant('space'),
                                            order: 8,
                                            children: []
                                        },
                                        {
                                            id: 'DG',
                                            domain: 'DG',
                                            code: 'dataGovernance',
                                            displayName: $translate.instant('data_governance'),
                                            order: 9,
                                            show: true,
                                            color: 'dg-menu',
                                            children: [
                                                {
                                                    id: 'DG-DICT',
                                                    domain: 'DICT',
                                                    code: 'DICT',
                                                    displayName: $translate.instant('indicator_dictionary'),
                                                    view: 'components/dictionary/dictionary-status.html',
                                                    color: 'dg-menu'
                                                },
                                                {
                                                    id: 'DG-COMP',
                                                    domain: 'COMP',
                                                    code: 'COMP',
                                                    displayName: $translate.instant('data_completeness'),
                                                    view: 'components/completeness/completeness.html',
                                                    color: 'dg-menu'
                                                },
                                                {
                                                    id: 'DG-WFG',
                                                    domain: 'WFG',
                                                    code: 'WFG',
                                                    displayName: $translate.instant('workflow_guidelines'),
                                                    view: 'views/workflow-guideline.html'

                                                },{
                                                    id: 'DG-FAQ',
                                                    domain: 'FAQ',
                                                    code: 'FAQ',
                                                    displayName: $translate.instant('faqs'),
                                                    view: 'views/faq.html' ,
                                                    color: 'dg-menu'
                                                }
                                            ]
                                        },
                                        {
                                            id: 'SPACE',
                                            displayName: $translate.instant('space'),
                                            order: 10,
                                            children: []
                                        },
                                        {
                                            id: 'LIB',
                                            domain: 'LIB',
                                            code: 'LIB',
                                            displayName: $translate.instant('document_library'),
                                            order: 11,
                                            children: [],
                                            //address: '../dhis-web-document-library',
                                            view: 'components/library/library-status.html',
                                            color: 'lib-menu'
                                        }
                                    ]
                                }
                            ];
                        });
                    });
                });
            });
        });
    });

    $scope.setSelectedMenu = function( menu ){

        if ( menu.address ){
            window.location.href = menu.address;
        }
        else{
            if( $scope.model.selectedMenu && $scope.model.selectedMenu.id === menu.id ){
                $scope.model.selectedMenu = null;
            }
            else{
                $scope.model.selectedMenu = menu;
            }
            SelectedMenuService.setSelectedMenu($scope.model.selectedMenu);

            $scope.$broadcast('MENU', $scope.model.selectedMenu);
        }
    };

    $scope.setBottomMenu = function(menu){
        if( $scope.model.selectedMenu && $scope.model.selectedMenu.domain === menu){
            $scope.model.selectedMenu = null;
        }
        else{
            $scope.model.selectedMenu = {domain: menu, view: $scope.model.bottomMenu[menu]};
        }
    };

    $scope.goToMenu = function( menuLink ){
        window.location.href = menuLink;
    };

    $scope.getMenuStyle = function( menu ){
        var style = menu.class + ' horizontal-menu font-16';
        if( menu.active ){
            style += ' active-horizontal-menu';
        }
        return style;
    };

    $scope.getTreeMenuStyle = function( menuItem ){
        var style = "";
        if ( menuItem ){
            if ( menuItem.id !== 'SPACE' ){
                style += 'active-menu-item';
            }
        }

        return style;
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
                            cost: $scope.model.cost,
                            displayVision2040: true
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

    $scope.settings = function(){

        var modalInstance = $modal.open({
            templateUrl: 'components/settings/settings-modal.html',
            controller: 'SettingsController'
        });

        modalInstance.result.then(function () {

        });
    };

});
