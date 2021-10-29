/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $modal,
                $translate,
                $filter,
                SessionStorageService,
                SelectedMenuService,
                NotificationService,
                NDPMenuService,
                MetaDataFactory) {

    $scope.model = {
        metaDataCached: false,
        dataElementGroups: [],
        dataElementGroupSets: [],
        dataElementGroup: [],
        optionSets: [],
        optionSetsById: [],
        selectedNDP: null,
        ndp: null,
        slides: []
    };

    var start = new Date();
    dhis2.ndp.downloadMetaData().then(function(){
        var end = new Date();
        SessionStorageService.set('METADATA_CACHED', true);
        console.log('Finished loading metadata in about ', Math.floor((end - start) / 1000), ' - secs');

        MetaDataFactory.getAll('optionSets').then(function(optionSets){

            $scope.model.ndp = $filter('getFirst')(optionSets, {code: 'ndp'});

            if( !$scope.model.ndp || !$scope.model.ndp.code || !$scope.model.ndp.options || $scope.model.ndp.options.length < 1 ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_ndp_configuration"));
                return;
            }

            var currentNDP = $filter('filter')($scope.model.ndp.options, {isCurrentNDP: true});
            if ( currentNDP && currentNDP.length && currentNDP.length === 1 ){
                $scope.model.selectedNDP = currentNDP[0];
            }

            $scope.model.metaDataCached = true;

            for( var i=1; i<=12; i++ ){
                $scope.model.slides.push({
                    id: i,
                    type: 'IMG',
                    path: 'images/NDPII_Visualizations/' + i + '.png',
                    style: 'background-image:url(images/NDPII_Visualizations/' + i + '.png)'
                });
            }

            var ndpMenus = [], order = 0;

            NDPMenuService.getMenu().then(function(menu){

                ndpMenus = menu;

                /*angular.forEach($scope.model.ndp.options, function(op){
                    op.show = false;
                    op.order = order;
                    op.ndp = true;
                    order++;

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

                    hl.children.push( {
                        id: op.code + '-GOL',
                        domain: 'NOUT',
                        code: 'goal',
                        ndp: op.code,
                        order: 3,
                        displayName: $translate.instant('goal_impact'),
                        children: [],
                        view: 'components/goal/goal-status.html',
                        color: 'ndp-menu'
                    } );

                    hl.children.push( {
                        id: op.code + '-OBJ',
                        domain: 'NOUT',
                        code: 'resultsFrameworkObjective',
                        ndp: op.code,
                        order: 4,
                        displayName: $translate.instant('objective_outcomes'),
                        children: [],
                        view: 'components/objective/objective-status.html',
                        color: 'ndp-menu'
                    });


                    hl.hasChildren = true;
                    hl.show = true;
                    hl.children.push( {
                        id: op.code + '-PRG',
                        domain: 'PRGO',
                        code: 'objective',
                        ndp: op.code,
                        order: 5,
                        displayName: $translate.instant('outcome_level'),
                        children: [],
                        view: 'components/programme-outcome/programme-status.html',
                        color: 'ndp-menu'
                    } );


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

                    sp.children.push( {
                        id: op.code + '-PIAP',
                        domain: 'PIAP',
                        code: 'piap',
                        ndp: op.code,
                        order: 3,
                        displayName: $translate.instant('piap_level'),
                        show: true,
                        view: 'components/piap/piap-status.html',
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

                    ndpMenus.push( op );
                });*/

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
                                        code: 'MDA',
                                        displayName: $translate.instant('mdas'),
                                        order: 1,
                                        children: [],
                                        view: 'components/mda/mda-status.html',
                                        color: 'il-menu'
                                    },
                                    {
                                        id: 'LOG',
                                        domain: 'LOG',
                                        code: 'LOG',
                                        displayName: $translate.instant('lgs'),
                                        order: 2,
                                        children: [],
                                        view: 'components/log/log-status.html',
                                        color: 'il-menu'
                                    },{
                                        id: 'LLG',
                                        domain: 'LLG',
                                        code: 'LLG',
                                        displayName: $translate.instant('llgs'),
                                        order: 3,
                                        color: 'il-menu',
                                        children: [],
                                        view: 'components/llg/llg-status.html'
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
                                        hasNoNDP: true,
                                        view: 'views/workflow-guideline.html'

                                    },{
                                        id: 'DG-FAQ',
                                        domain: 'FAQ',
                                        code: 'FAQ',
                                        displayName: $translate.instant('faqs'),
                                        view: 'views/faq.html' ,
                                        hasNoNDP: true,
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
                                hasNoNDP: true,
                                color: 'lib-menu'
                            }
                        ]
                    }
                ];
            });
        });
    });

    $scope.$watch('model.selectedNDP', function(){
        $scope.model.selectedMenu = null;
    });

    $scope.setSelectedMenu = function( menu ){

        if ( menu.address ){
            window.location.href = menu.address;
        }
        else{
            if ( !menu.hasNoNDP && !$scope.model.selectedNDP ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("please_selected_ndp"));
                return;
            }

            if( $scope.model.selectedMenu && $scope.model.selectedMenu.id === menu.id ){
                $scope.model.selectedMenu = null;
            }
            else{
                $scope.model.selectedMenu = menu;
                if( $scope.model.selectedNDP && $scope.model.selectedNDP.code ){
                    $scope.model.selectedMenu.ndp = $scope.model.selectedNDP.code;
                }
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

    $scope.settings = function(){

        var modalInstance = $modal.open({
            templateUrl: 'components/settings/settings-modal.html',
            controller: 'SettingsController'
        });

        modalInstance.result.then(function () {

        });
    };

});
