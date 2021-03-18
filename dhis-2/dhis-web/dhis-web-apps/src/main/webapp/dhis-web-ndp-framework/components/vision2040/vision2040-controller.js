/* Controllers */

/* global ndpFramework */


ndpFramework.controller('Vision2040Controller',
    function($scope,
        $translate,
        $modal,
        $filter,
        NotificationService,
        MetaDataFactory,
        DashboardService,
        OptionComboService) {

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
        maps: []
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
        $scope.model.baseLineTargetActualDimensions = $.map($scope.model.bta.options, function(d){return d.id;});

        MetaDataFactory.getAll('dataElements').then(function(dataElements){

            $scope.model.dataElementsById = dataElements.reduce( function(map, obj){
                map[obj.id] = obj;
                return map;
            }, {});

            MetaDataFactory.getDataElementGroups().then(function(dataElementGroups){

                $scope.model.downloadLabel = $translate.instant('download_visualization');
                $scope.model.metaDataCached = true;

                $scope.model.dataElementGroups = dataElementGroups;

                var v2040 = $filter('filter')($scope.model.dataElementGroups, {indicatorGroupType: 'vision2040'}, true);

                if ( v2040 && v2040.length === 1 && v2040[0].dataElements && v2040[0].dataElements.length > 0 ){
                    angular.forEach(v2040[0].dataElements, function(_de){
                        var de = $scope.model.dataElementsById[_de.id];
                        if( de ){
                            $scope.model.vision2040.push( de );
                        }
                    });
                }
                else{

                    NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_bta_dimensions"));
                    return;
                }

                if ( $scope.model.vision2040.length > 0 ){
                    $scope.model.dashboardName = 'Vision2040';
                    DashboardService.getByName( $scope.model.dashboardName ).then(function( result ){
                        $scope.model.dashboardItems = result.dashboardItems;
                        $scope.model.charts = result.charts;
                        $scope.model.tables = result.tables;
                        $scope.model.maps = result.maps;
                        $scope.model.dashboardFetched = true;
                    });
                }
            });
        });
    });

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
