/* Controllers */

/* global ndpFramework */


ndpFramework.controller('SectorController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/sector/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/sector/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/sector/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/sector/dashboard.html'}
    ];
    
});