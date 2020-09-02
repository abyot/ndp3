/* Controllers */

/* global ndpFramework */


ndpFramework.controller('LOGController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/log/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/log/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/log/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/log/dashboard.html'}
    ];
    
});