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
                                    id: 'SDG',
                                    domain: 'SDG',
                                    displayName: $translate.instant('sdg'),
                                    order: 0,
                                    path: "sdg",
                                    children: []
                                },
                                {
                                    id: 'NDP',
                                    domain: 'NDP',
                                    displayName: $translate.instant('ndps'),
                                    order: 1,
                                    children: ndpMenus,
                                    hasChildren: true
                                },
                                {
                                    id: 'SEC',
                                    domain: 'SEC',
                                    displayName: $translate.instant('ssp'),
                                    order: 2,
                                    children: []
                                },
                                {
                                    id: 'MDA',
                                    domain: 'MDA',
                                    displayName: $translate.instant('mdas'),
                                    order: 3,
                                    children: []
                                },
                                {
                                    id: 'LOG',
                                    domain: 'LOG',
                                    displayName: $translate.instant('lgs'),
                                    order: 4,
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
                
                    var objectives = $filter('filter')($scope.model.dataElementGroupSets, {ndp: child.code, indicatorGroupSetType: 'objective'}, true);
                    var goals = $filter('filter')($scope.model.dataElementGroupSets, {ndp: child.code, indicatorGroupSetType: 'goal'}, true);
                    var programs = $filter('filter')($scope.model.optionSets, {ndp: child.code, code: 'program'}, true);
                    var interventions = $filter('filter')($scope.model.dataElementGroupSets, {ndp: child.code, indicatorGroupSetType: 'intervention'}, true);
                    
                    child.children = [];
                    if( objectives.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-OBJ',
                            domain: 'OBJ',
                            code: 'objective',
                            ndp: child.code,
                            order: 1,                            
                            displayName: $translate.instant('objectives'),
                            children: []
                        } );
                    }

                    if( goals.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-GOL',
                            domain: 'GOL',
                            code: 'goal',
                            ndp: child.code,
                            order: 0,
                            displayName: $translate.instant('goal'),
                            children: []
                        } ); 
                    }

                    if( programs.length > 0 ){
                        child.hasChildren = true;
                        child.children.push( {
                            id: child.code + '-PRG',
                            domain: 'PRG',
                            code: 'objective',
                            ndp: child.code,
                            order: 2,
                            displayName: $translate.instant('programmes'),
                            children: []
                        } );
                        
                        child.children.push( {
                            id: child.code + '-PRJ',
                            domain: 'PRJ',
                            code: 'project',
                            ndp: child.code,
                            order: 3,
                            displayName: $translate.instant('projects'),
                            chilren: [],
                            show: false
                        } );
                    }
                    
                    if( interventions.length > 0 ){
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
                    }
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
