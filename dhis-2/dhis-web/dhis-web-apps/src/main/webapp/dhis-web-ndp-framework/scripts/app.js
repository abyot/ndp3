'use strict';

/* App Module */

var ndpFramework = angular.module('ndpFramework',
        ['ui.bootstrap', 
         'ngRoute', 
         'ngCookies',
         'ngSanitize',
         'ngMessages',
         'ndpFrameworkServices',
         'ndpFrameworkFilters',
         'ndpFrameworkDirectives',
         'd2Directives',
         'd2Filters',
         'd2Services',
         'd2Controllers',
         'angularLocalStorage',
         'ui.select',
         'ui.select2',
         'pascalprecht.translate'])
              
.value('DHIS2URL', '../api')

.config(function($httpProvider, $routeProvider, $translateProvider) {    
            
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    
    $routeProvider.when('/home', {
        templateUrl:'components/home/home.html',
        controller: 'HomeController'
    }).when('/reports', {
        templateUrl:'components/reports/report-types.html',
        controller: 'reportTypesController'
    }).when('/report-whodoeswhat',{
        templateUrl:'components/reports/wdw/whodoeswhat.html',
        controller: 'WhoDoesWhatController'
    }).when('/report-popcoverage',{
        templateUrl:'components/reports/poc/popcoverage.html',
        controller: 'PopCoverageController'
    }).when('/report-geocoverage',{
        templateUrl:'components/reports/gec/geocoverage.html',
        controller: 'GeoCoverageController'
    }).when('/report-dataexport',{
        templateUrl:'components/reports/dex/dataexport.html',
        controller: 'DataExportController'
    }).otherwise({
        redirectTo : '/home'
    });  
    
    $translateProvider.preferredLanguage('en');
    $translateProvider.useSanitizeValueStrategy('escaped');
    $translateProvider.useLoader('i18nLoader');    
})

.run(function($rootScope){    
    $rootScope.maxOptionSize = 1000;
});
