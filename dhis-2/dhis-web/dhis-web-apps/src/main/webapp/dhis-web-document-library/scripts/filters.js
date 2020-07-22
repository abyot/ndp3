'use strict';

/* Filters */

var docLibraryFilters = angular.module('docLibraryFilters', [])


.filter('fileSize', function(){
    return function(bytes){

        if(!bytes ){
            return;
        }        
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };
});