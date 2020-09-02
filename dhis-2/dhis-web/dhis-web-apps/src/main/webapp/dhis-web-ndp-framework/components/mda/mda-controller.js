/* Controllers */

/* global ndpFramework */


ndpFramework.controller('MDAController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [
        {id: 'plan', title: 'plans', order: 1, view: 'components/mda/plans.html'},
        {id: 'report', title: 'reports', order: 2, view: 'components/mda/reports.html'},
        {id: 'performance', title: 'performance', order: 3, view: 'components/mda/performance.html', active: true},
        {id: 'dashboard', title: 'dashboard', order: 4, view: 'components/mda/dashboard.html'}
    ];
    
});