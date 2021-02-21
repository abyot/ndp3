/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $translate,
                $filter,
                SessionStorageService,
                SelectedMenuService,
                MetaDataFactory) {

    $scope.model = {
        metaDataCached: false,
        dataElementGroups: [],
        dataElementGroupSets: [],
        optionSets: [],
        optionSetsById: [],
        ndp: null,
        programs: [],
        selectedProgram: null,
        bottomMenu: {
            FAQ: '',
            CMP: 'components/completeness/completeness.html',
            DCT: 'components/dictionary/dictionary.html'
        }
    };

    dhis2.ndp.downloadMetaData().then(function(){
        SessionStorageService.set('METADATA_CACHED', true);
        console.log('Finished loading metadata');

        MetaDataFactory.getAll('optionSets').then(function(optionSets){

            $scope.model.optionSets = optionSets;

            angular.forEach(optionSets, function(optionSet){
                $scope.model.optionSetsById[optionSet.id] = optionSet;
            });

            var ndpOptions = $filter('filter')(optionSets, {code: 'ndp'});

            if( ndpOptions && ndpOptions.length > 0 ){
                $scope.model.ndp = angular.copy( ndpOptions[0] );
            }

            MetaDataFactory.getAll('dataElementGroupSets').then(function( dataElementGroupSets ){
                $scope.model.dataElementGroupSets = dataElementGroupSets;

                MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){
                    $scope.model.dataElementGroups = dataElementGroups;

                    $scope.model.metaDataCached = true;

                    var ndpMenus = [], order = 0;
                    angular.forEach($scope.model.ndp.options, function(op){
                        op.order = order;
                        order++;

                        var objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'resultsFrameworkObjective'}, true);
                        var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: op.code, indicatorGroupSetType: 'goal'}, true);
                        var programs = $filter('filter')($scope.model.optionSets, {ndp: op.code, code: 'program'}, true);
                        //var sdgs = $filter('filter')($scope.model.dataElementGroupSets, {indicatorGroupSetType: 'sdgGoals'}, true);

                        op.children = [];

                        /*if( sdgs.length > 0 ){
                            op.hasChildren = true;
                            op.show = true;
                            op.children.push( {
                                id: op.code + '-SDG',
                                domain: 'SDG',
                                code: 'sdg',
                                ndp: op.code,
                                order: 0,
                                displayName: $translate.instant('sdg_outcomes'),
                                children: [],
                                view: 'components/sdg/sdg-status.html'
                            } );
                        }*/

                        if( objectives.length > 0 || goals.length > 0 ){
                            op.hasChildren = true;
                            op.show = true;
                            op.children.push( {
                                id: op.code + '-OUT',
                                domain: 'NOUT',
                                code: 'resultsFrameworkObjective',
                                ndp: op.code,
                                order: 1,
                                displayName: $translate.instant('ndp_outcomes'),
                                children: [],
                                view: 'components/outcome/outcome-status.html'
                            } );
                        }

                        if( programs.length > 0 ){
                            op.hasChildren = true;
                            op.show = true;
                            op.children.push( {
                                id: op.code + '-PRG',
                                domain: 'PRGO',
                                code: 'ndpObjective',
                                ndp: op.code,
                                order: 2,
                                displayName: $translate.instant('programme_outcomes'),
                                children: [],
                                view: 'components/programme-outcome/programme-status.html'
                            } );

                            op.hasChildren = true;
                            op.show = true;
                            op.children.push( {
                                id: op.code + '-SUB',
                                domain: 'SUB',
                                code: 'ndpObjective',
                                ndp: op.code,
                                order: 2,
                                displayName: $translate.instant('sub_programme_outcomes'),
                                children: [],
                                view: 'components/sub-programme/sub-programme-status.html'
                            } );

                            op.children.push( {
                                id: op.code + '-PIA',
                                domain: 'PIAP',
                                code: 'sub-programme',
                                ndp: op.code,
                                order: 2,
                                displayName: $translate.instant('piap_outputs'),
                                show: true,
                                view: 'components/piap/piap-status.html',
                                children: []
                            } );
                        }

                        ndpMenus.push( op );
                    });

                    $scope.model.menuItems = [
                        {
                            id: 'navigation',
                            order: 0,
                            displayName: $translate.instant('navigation'),
                            bold: true,
                            show: true,
                            children: [
                                {
                                    id: 'NDP',
                                    domain: 'NDP',
                                    displayName: $translate.instant('ndps'),
                                    order: 1,
                                    children: ndpMenus,
                                    hasChildren: ndpMenus.length > 0 ? true : false,
                                    show: ndpMenus.length > 0 ? true : false
                                },
                                {
                                    id: 'SPACE',
                                    displayName: $translate.instant('space'),
                                    order: 2,
                                    children: []
                                },
                                {
                                    id: 'SDG',
                                    domain: 'SDG',
                                    code: 'sdgGoals',
                                    displayName: $translate.instant('sdg_outcomes'),
                                    order: 3,
                                    children: [],
                                    view: 'components/sdg/sdg-status.html'
                                },
                                {
                                    id: 'SPACE',
                                    displayName: $translate.instant('space'),
                                    order: 4,
                                    children: []
                                },
                                {
                                    id: 'PRGP',
                                    domain: 'PRGP',
                                    displayName: $translate.instant('programme_performance'),
                                    order: 5,
                                    children: [],
                                    view: 'components/programme-performance/programme-performance.html'
                                },
                                {
                                    id: 'PRJP',
                                    domain: 'PRJP',
                                    displayName: $translate.instant('project_performance'),
                                    order: 6,
                                    children: [],
                                    view: 'components/project/performance.html'
                                },
                                {
                                    id: 'MDA',
                                    domain: 'MDA',
                                    displayName: $translate.instant('mda_performance'),
                                    order: 7,
                                    children: [],
                                    view: 'components/mda/mda-status.html'
                                },
                                {
                                    id: 'LOG',
                                    domain: 'LOG',
                                    displayName: $translate.instant('log_performance'),
                                    order: 8,
                                    children: [],
                                    view: 'components/log/log-status.html'
                                }
                            ]
                        }
                    ];
                });
            });
        });
    });

    $scope.setSelectedMenu = function( menu ){
        if( $scope.model.selectedMenu && $scope.model.selectedMenu.id === menu.id ){
            $scope.model.selectedMenu = null;
        }
        else{
            $scope.model.selectedMenu = menu;
        }
        SelectedMenuService.setSelectedMenu($scope.model.selectedMenu);

        $scope.$broadcast('MENU', $scope.model.selectedMenu);
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
});
