/* Controllers */

/* global ndpFramework */


ndpFramework.controller('InterventionController', 
    function($scope){
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/intervention/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/intervention/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/intervention/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/intervention/dashboard.html'}
    ];
    
});