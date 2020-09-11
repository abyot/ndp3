/* Controllers */

/* global ndpFramework */


ndpFramework.controller('MDAController', 
    function($scope){
    
    $scope.model = {
        sdgBody: "Test"
    };
    
    $scope.model.horizontalMenus = [
        {id: 'performance', title: 'results', order: 1, view: 'components/mda/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 2, view: 'components/mda/dashboard.html'},
        {id: 'library', title: 'library', order: 3, view: 'components/mda/library.html'}
    ];
    
});