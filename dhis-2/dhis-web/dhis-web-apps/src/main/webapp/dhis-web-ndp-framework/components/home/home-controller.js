/* global angular, dhis2, ndpFramework */

'use strict';

//Controller for settings page
ndpFramework.controller('HomeController',
        function($scope,
                $translate,
                $modal,
                $filter,
                SelectedMenuService,
                orderByFilter,
                MetaDataFactory,
                OrgUnitFactory) {
   
    $scope.model = {
        metaDataCached: false,
        data: null,
        dataElements: [],
        dataElementsById: [],
        dataElementGroups: [],
        dataElementGroupSets: [],
        selectedDataElementGroups: [],
        selectedDataElementGroupSets: [],
        baseLineTargetActualDimensions: [],
        dataSetsById: {},
        categoryCombosById: {},
        optionSets: [],
        optionSetsById: [],
        dictionaryItems: [],
        attributes: [],
        selectedPeriods: [],
        periods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        selectedDataElementGroup: null,
        selectedDictionary: null,
        dictionaryHeaders: {},
        ndp: null,
        ndpProgram: null,
        selectedNDP: null,
        programs: [],
        selectedProgram: null,
        groupSetSize: {},
        physicalPerformance: true,
        financialPerformance: true,
        showProjectDetails: false
    };

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
    
    /*$scope.model.horizontalMenus = [
        {id: 'sdg', title: 'sdg', order: 1, view: 'components/home/sdg-status.html'},
        {id: 'ndp', title: 'ndp_key_results', order: 2, view: 'components/home/ndp-status.html', active: true},
        {id: 'program', title: 'programme_performance', order: 3, view: 'components/home/program-performance.html'},
        //{id: 'sub-program', title: 'sub_program_performance', order: 4, view: 'components/home/sub-program-performance.html'},
        //{id: 'project', title: 'project_status', order: 5, view: 'components/home/project-status.html'},
        {id: 'sdp', title: 'sdp', order: 5, view: 'components/home/sector-performance.html'},
        //{id: 'vote', title: 'vote_performance', order: 6, view: 'components/home/vote-performance.html'},
        {id: 'subNational', title: 'lgdp', order: 6, view: 'components/home/sub-national-data.html'}
    ];

    $scope.model.activeHorizontalMenu = $scope.model.horizontalMenus[1];

    $scope.$watch('model.selectedDictionary', function(){
        if( angular.isObject($scope.model.selectedDictionary) && $scope.model.selectedDictionary.id){
            
        }
    });
    
    $scope.$watch('model.selectedNDP', function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.model.selectedDataElementGroup = null;
        $scope.model.dataElementGroup = [];
        $scope.model.groupSetSize = {};
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedNDP) && $scope.model.selectedNDP.id && $scope.model.selectedNDP.code){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndp: $scope.model.selectedNDP.code, indicatorGroupSetType: 'objective'}, true);
            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                var size = 0;
                angular.forEach(degs.dataElementGroups, function(deg){
                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0];
                    size += _deg.dataElements.length;
                    _deg.dataElementGroupSetName = degs.displayName;
                    _deg.dataElementGroupSetId = degs.id;
                    $scope.model.dataElementGroup.push( _deg );
                });
                $scope.model.groupSetSize[degs.id] = size;
            });
        }
    });
    
    $scope.$watch('model.selectedDataElementGroupSet', function(){
        $scope.model.selectedDataElementGroup = null;
        $scope.model.dataElementGroup = [];
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedDataElementGroupSet) && $scope.model.selectedDataElementGroupSet.id){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {id: $scope.model.selectedDataElementGroupSet.id});
            angular.forEach($scope.model.selectedDataElementGroupSet.dataElementGroups, function(deg){
                $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
            });
        }
        else{
            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                angular.forEach(degs.dataElementGroups, function(deg){
                    $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0] );
                });
            });
        }
    });
    
    $scope.$watch('model.selectedDataElementGroup', function(){
        $scope.resetDataView();
        $scope.model.dataElementGroup = [];
        if( angular.isObject($scope.model.selectedDataElementGroup) && $scope.model.selectedDataElementGroup.id){
            $scope.model.dataElementGroup.push( $filter('filter')($scope.model.dataElementGroups, {id: $scope.model.selectedDataElementGroup.id})[0] );
            $scope.getAnalyticsData();
        }
    });
    
    $scope.$watch('model.selectedNdpProgram', function(){
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.model.dataElementGroup = [];
        $scope.model.groupSetSize = {};
        $scope.resetDataView();
        if( angular.isObject($scope.model.selectedNdpProgram) && $scope.model.selectedNdpProgram.id && $scope.model.selectedNdpProgram.code){
            $scope.model.selectedDataElementGroupSets = $filter('filter')($scope.model.dataElementGroupSets, {ndpProgramme: $scope.model.selectedNdpProgram.code, indicatorGroupSetType: 'objective'});
            angular.forEach($scope.model.selectedDataElementGroupSets, function(degs){
                var size = 0;
                angular.forEach(degs.dataElementGroups, function(deg){
                    var _deg = $filter('filter')($scope.model.dataElementGroups, {id: deg.id})[0];
                    size += _deg.dataElements.length;
                    _deg.dataElementGroupSetName = degs.displayName;
                    _deg.dataElementGroupSetId = degs.id;
                    $scope.model.dataElementGroup.push( _deg );
                });
                $scope.model.groupSetSize[degs.id] = size;
            });
        }
    });*/
    
    dhis2.ndp.downloadMetaData().then(function(){
        
        MetaDataFactory.getAll('attributes').then(function(attributes){
            
            $scope.model.attributes = attributes;
            
            
        
            MetaDataFactory.getAll('categoryCombos').then(function(categoryCombos){
                angular.forEach(categoryCombos, function(cc){
                    $scope.model.categoryCombosById[cc.id] = cc;
                });

                MetaDataFactory.getAll('optionSets').then(function(optionSets){

                    $scope.model.optionSets = optionSets;

                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSetsById[optionSet.id] = optionSet;
                    });
                    
                    $scope.model.ndp = $filter('filter')(optionSets, {code: 'ndp'})[0];
                    $scope.model.ndpProgram = $filter('filter')(optionSets, {code: 'ndpIIIProgram'})[0];


                    MetaDataFactory.getAll('dataSets').then(function(dataSets){

                        angular.forEach(dataSets, function(ds){
                            ds.dataElements = ds.dataElements.map(function(de){ return de.id; });
                            $scope.model.dataSetsById[ds.id] = ds;
                        });

                        $scope.model.dataSets = dataSets;
                        
                        MetaDataFactory.getAll('dataElementGroupSets').then(function( dataElementGroupSets ){
                            $scope.model.dataElementGroupSets = dataElementGroupSets;
                            MetaDataFactory.getAll('dataElementGroupSets').then(function(dataElementGroups){
                                $scope.model.dataElementGroups = dataElementGroups;
                                
                                MetaDataFactory.getAll('dataElements').then(function(dataElements){

                                    angular.forEach(dataElements, function(de){
                                        $scope.model.dataElementsById[de.id] = de;
                                        var cc = $scope.model.categoryCombosById[de.categoryCombo.id];
                                        de.disaggregation = !cc || cc.isDefault ? '-' : cc.displayName;

                                        for(var i=0; i<$scope.model.dataSets.length; i++){
                                            if( $scope.model.dataSets[i].dataElements.indexOf(de.id) !== -1 ){
                                                var ds = $scope.model.dataSets[i];
                                                de.periodType = ds.periodType  === 'FinancialJuly' ? 'Fiscal year' : ds.periodType;
                                                de.vote = ds.organisationUnits.map(function(ou){
                                                    return ou.code;
                                                });

                                                if( de.vote && de.vote.length > 0 ){
                                                    de.vote = de.vote.sort();
                                                    de.vote = de.vote.join(', ');
                                                }
                                                break;
                                            }
                                        }
                                    });

                                    var item = {id: 'dataElements', name: $translate.instant('indicators')};
                                    $scope.model.selectedDictionary = item;
                                    $scope.model.dictionaryItems.push( item );
                                    $scope.model.dataElements = dataElements;
                                    $scope.sortHeader = {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false};
                                    $scope.model.dictionaryHeaders['dataElements'] = [
                                        {id: 'displayName', name: 'name', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'code', name: 'code', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'disaggregation', name: 'disaggregation', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'valueType', name: 'valueType', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'periodType', name: 'frequency', colSize: "col-sm-1", show: true, fetch: false},
                                        {id: 'vote', name: 'vote', colSize: 'col-sm-1', show: true, fetch: false}
                                    ];

                                    angular.forEach($scope.model.attributes, function(att){
                                        if(att['dataElementAttribute']){
                                            var header = {id: att.id, name: att.name, show: false, fetch: true, colSize: "col-sm-1"};
                                            $scope.model.dictionaryHeaders['dataElements'].push(header);
                                        }
                                    });

                                    $scope.model.metaDataCached = true;
                                    $scope.model.menuTitle = $translate.instant('menu_title');

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
                });    
            });

        });    
    });
    
    
    $scope.showCategoryDetail = function(){
        
    };
    
    $scope.sortItems = function(header){        
        $scope.reverse = ($scope.sortHeader && $scope.sortHeader.id === header.id) ? !$scope.reverse : false;
        $scope.sortHeader = header;       
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
       
    $scope.showDetails = function( item ){
        var modalInstance = $modal.open({
            templateUrl: 'views/details-modal.html',
            controller: 'DetailsController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id];
                },
                dictionaryItem: function(){
                    return item;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {            
            $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id] = gridColumns;           
        });
    };
    
    $scope.showHideColumns = function(){
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id];
                },
                hiddenGridColumns: function(){
                    return ($filter('filter')($scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id], {show: false})).length;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {            
            $scope.model.dictionaryHeaders[$scope.model.selectedDictionary.id] = gridColumns;           
        });
    };
    
    $scope.resetView = function(horizontalMenu){
        $scope.model.activeHorizontalMenu = horizontalMenu;
        $scope.model.selectedDataElementGroupSets = [];
        $scope.model.selectedDataElementGroupSet = null;
        $scope.model.selectedDataElementGroup = null;
        $scope.model.selectedNDP = null;     
        $scope.resetDataView();
    };
    
    $scope.resetDataView = function(){
        $scope.model.data = null;
        $scope.model.reportReady = false;
        $scope.model.dataExists = false;
        $scope.model.dataHeaders = [];
    };
    
   
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
        window.location.href = '../' + menuLink;
    };
});
