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
        selectedPeriodType: 'FinancialJuly',
        slides: []
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

                            for( var i=1; i<12; i++ ){
                                $scope.model.slides.push({
                                    id: i,
                                    type: 'IMG',
                                    path: 'images/NDPII_Visualizations/' + i + '.png',
                                    style: 'background-image:url(images/NDPII_Visualizations/' + i + '.png)'
                                });
                            }

                            var periods = PeriodService.getPeriods($scope.model.selectedPeriodType, $scope.model.periodOffset, $scope.model.openFuturePeriods);
                            $scope.model.allPeriods = angular.copy( periods );
                            $scope.model.periods = periods;
                            var selectedPeriodNames = ['2024/25'];
                            angular.forEach($scope.model.periods, function(pe){
                                if(selectedPeriodNames.indexOf(pe.displayName) > -1 ){
                                   $scope.model.selectedPeriods.push(pe);
                                }
                            });

                            var ndpMenus = [], order = 0;
                            angular.forEach($scope.model.ndp.options, function(op){
                                console.log('op:  ', op);
                                op.children = [];
                                op.hasChildren = false;
                                op.show = false;
                                op.order = order;
                                op.ndp = true;
                                order++;

                                var objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'resultsFrameworkObjective'}, true);
                                var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'goal'}, true);
                                var vision2040Targets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'vision2040'}, true);
                                var programs = []
                                var pr = $filter('getFirst')($scope.model.optionSets, {ndp: op.code, isNDPProgramme: true}, true);
                                if ( pr && pr.options && pr.options.length > 0 ){
                                    programs = pr.options;
                                }

                                if ( objectives.length > 0 || goals.length > 0 || vision2040Targets.length > 0 || programs.length > 0){
                                    op.children = [];
                                    op.hasChildren = true;
                                    op.show = op.code === 'NDPIII';

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

                                    if ( vision2040Targets.length > 0 ){
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
                                        });
                                    }

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
                                    }

                                    if( objectives.length > 0 ){
                                        hl.children.push( {
                                            id: op.code + '-OBJ',
                                            domain: 'NOUT',
                                            code: 'resultsFrameworkObjective',
                                            ndp: op.code,
                                            order: 3,
                                            displayName: $translate.instant('objective_level'),
                                            children: [],
                                            view: 'components/objective/objective-status.html',
                                            color: 'ndp-menu'
                                        } );
                                    }
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
                                    };

                                    sp.hasChildren = true;
                                    sp.show = true;
                                    sp.children.push( {
                                        id: op.code + '-SUB-OUTCOME',
                                        domain: 'SUB-OUTCOME',
                                        code: 'subProgrammeObjective',
                                        ndp: op.code,
                                        order: 2,
                                        displayName: $translate.instant('outcome_level'),
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

                                    op.children.push(sp);

                                    var pr = {
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
                                        ndp: op.code,
                                        code: 'project',
                                        displayName: $translate.instant('project_performance'),
                                        order: 1,
                                        children: [],
                                        view: 'components/project/performance.html'
                                    });

                                    op.children.push(pr);
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

    $scope.settings = function(){

        var modalInstance = $modal.open({
            templateUrl: 'components/settings/settings-modal.html',
            controller: 'SettingsController'
        });

        modalInstance.result.then(function () {

        });
    };

});
