/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $translate,
                $filter,
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
        selectedProgram: null
    };

    dhis2.ndp.downloadMetaData().then(function(){

        MetaDataFactory.getAll('optionSets').then(function(optionSets){

            $scope.model.optionSets = optionSets;

            angular.forEach(optionSets, function(optionSet){
                $scope.model.optionSetsById[optionSet.id] = optionSet;
            });

            $scope.model.ndp = $filter('filter')(optionSets, {code: 'ndp'})[0];

            MetaDataFactory.getAll('dataElementGroupSets').then(function( dataElementGroupSets ){
                $scope.model.dataElementGroupSets = dataElementGroupSets;

                MetaDataFactory.getAll('dataElementGroups').then(function(dataElementGroups){
                    $scope.model.dataElementGroups = dataElementGroups;

                    $scope.model.metaDataCached = true;

                    var ndpMenus = [], order = 0;
                    angular.forEach($scope.model.ndp.options, function(op){
                        op.order = order;
                        order++;
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
                                    hasChildren: true
                                },
                                {
                                    id: 'SPACE',
                                    displayName: $translate.instant('space'),
                                    order: 2,
                                    children: []
                                },
                                {
                                    id: 'PRG',
                                    domain: 'PRG',
                                    displayName: $translate.instant('programme_performance'),
                                    order: 3,
                                    children: []
                                },
                                {
                                    id: 'SUB',
                                    domain: 'SUB',
                                    displayName: $translate.instant('sub_programme_performance'),
                                    order: 4,
                                    children: []
                                },
                                {
                                    id: 'PRJ',
                                    domain: 'PRJ',
                                    displayName: $translate.instant('project_performance'),
                                    order: 5,
                                    children: []
                                },
                                {
                                    id: 'MDALG',
                                    domain: 'MDALG',
                                    displayName: $translate.instant('mdalg_performance'),
                                    order: 6,
                                    children: []
                                }
                            ]
                        }
                    ];
                });
            });
        });
    });

    //expand/collapse of navigation menu
    $scope.expandCollapse = function(menu) {

        if( menu.hasChildren ){
            menu.show = !menu.show;

            //Get children menu
            angular.forEach(menu.children, function(child){

                if( menu.id === 'NDP'){

                    var objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: child.code, indicatorGroupSetType: 'resultsFrameworkObjective'}, true);
                    var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: child.code, indicatorGroupSetType: 'goal'}, true);
                    var programs = $filter('filter')($scope.model.optionSets, {ndp: child.code, code: 'program'}, true);
                    var sdgs = $filter('filter')($scope.model.dataElementGroupSets, {indicatorGroupSetType: 'sdg'}, true);

                    child.children = [];

                    if( sdgs.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: 'SDG',
                            domain: 'SDG',
                            code: 'sdg',
                            ndp: child.code,
                            order: 0,
                            displayName: $translate.instant('sdg_outcomes'),
                            children: []
                        } );
                    }

                    if( objectives.length > 0 || goals.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-OBJ',
                            domain: 'OBJ',
                            code: 'resultsFrameworkObjective',
                            ndp: child.code,
                            order: 1,
                            displayName: $translate.instant('ndp_outcomes'),
                            children: []
                        } );
                    }

                    if( programs.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-PRG',
                            domain: 'NPRG',
                            code: 'objective',
                            ndp: child.code,
                            order: 2,
                            displayName: $translate.instant('programme_outcomes'),
                            children: []
                        } );

                        child.children.push( {
                            id: child.code + '-PRG-SUB',
                            domain: 'NSUB',
                            code: 'objective',
                            ndp: child.code,
                            order: 2,
                            displayName: $translate.instant('sub_programme_outcomes'),
                            show: true,
                            children: [
                                {
                                    id: child.code + '-PRG-SUB-PRJ',
                                    domain: 'NPRJ',
                                    code: 'objective',
                                    ndp: child.code,
                                    order: 2,
                                    displayName: $translate.instant('output_projects'),
                                },
                                {
                                    id: child.code + '-PRG-SUB-DEP',
                                    domain: 'NDEP',
                                    code: 'objective',
                                    ndp: child.code,
                                    order: 2,
                                    displayName: $translate.instant('output_departments'),
                                }
                            ]
                        } );

                        /*child.children.push( {
                            id: child.code + '-PIAP',
                            domain: 'PIAP',
                            code: 'project',
                            ndp: child.code,
                            order: 3,
                            displayName: $translate.instant('piap_outputs'),
                            chilren: [],
                            show: false
                        } );*/
                    }

                    /*if( interventions.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-INV',
                            domain: 'INV',
                            code: 'intervention',
                            ndp: child.code,
                            order: 4,
                            displayName: $translate.instant('interventions'),
                            children: []
                        } );
                    }*/
                }

            });
        }
        else{
            menu.show = !menu.show;
        }
    };

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
            $scope.model.selectedMenu = {domain: menu};
        }
    };

    $scope.goToMenu = function( menuLink ){
        window.location.href = menuLink;
    };
});
