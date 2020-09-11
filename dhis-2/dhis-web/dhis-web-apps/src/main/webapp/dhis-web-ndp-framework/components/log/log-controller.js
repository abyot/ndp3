/* Controllers */

/* global ndpFramework */


ndpFramework.controller('LOGController', 
    function($scope){
    

    $scope.model.horizontalMenus = [        
        {id: 'performance', title: 'results', order: 1, view: 'components/log/performance.html', active: true},
        {id: 'dashboard', title: 'dashboards', order: 2, view: 'components/log/dashboard.html'},
        {id: 'library', title: 'library', order: 3, view: 'components/log/library.html'}
    ];
    
});