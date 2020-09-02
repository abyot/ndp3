/* Controllers */

/* global ndpFramework */


ndpFramework.controller('SDGController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/sdg/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/sdg/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/sdg/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/sdg/dashboard.html'}
    ];
    
});