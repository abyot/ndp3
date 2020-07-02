/* Controllers */

/* global ndpFramework */

ndpFramework.controller('DetailsController', 
    function($scope, 
            $modalInstance,
            gridColumns,
            dictionaryItem){
    
    $scope.gridColumns = gridColumns;
    $scope.dictionaryItem = dictionaryItem;
    
    $scope.close = function () {
        $modalInstance.close($scope.gridColumns);
    };
    
    $scope.showHideColumns = function(gridColumn){
       
        if(gridColumn.show){                
            $scope.hiddenGridColumns--;            
        }
        else{
            $scope.hiddenGridColumns++;            
        }
    };    
});
