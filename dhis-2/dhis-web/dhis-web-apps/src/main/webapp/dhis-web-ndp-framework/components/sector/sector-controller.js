/* Controllers */

/* global ndpFramework */


ndpFramework.controller('SectorController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [        
        {id: 'performance', title: 'results', order: 3, view: 'components/sector/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 4, view: 'components/sector/dashboard.html'},
        {id: 'library', title: 'library', order: 1, view: 'components/sector/library.html'}
    ];
    
});