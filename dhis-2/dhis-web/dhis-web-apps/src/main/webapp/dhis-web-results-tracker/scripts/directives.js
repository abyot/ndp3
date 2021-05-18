/* global directive, selection, dhis2, angular */

'use strict';

/* Directives */

var actionMappingDirectives = angular.module('actionMappingDirectives', [])

.directive('d2Blur', function () {
    return function (scope, elem, attrs) {
        elem.change(function () {
            scope.$apply(attrs.d2Blur);
        });
    };
});