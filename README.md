# cs415-assignment-1
dummy operating system for 415   

## process guidelines   
'use strict'; as your first line of code   
 
wrap your entire function in a closure:   
 ```
(function () {   

    // your code goes here      

})();   
```

## naming conventions    
'processes' are named as the name of the process.   

os files are named based on their structure for example:   
os.fs.read.js   
os.fs.write.js   
os.ps.registerProcess.js   

## os data structures   
os._internals is used to store the filesystem and process data   
should not be accessed outside the os files   
