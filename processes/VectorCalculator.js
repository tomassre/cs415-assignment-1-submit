'use strict';

/*
this will be using the async.waterfall library to manage callbacks
 */
(function () {

    os.ps.register('vectorCalculator', main);

    function main() {

        // start doing some fs operations
        async.waterfall([

            /*
            First we are going to get the length since that does not require the file to be open
             */
            function (callback) {
                os.fs.length('vector_data.csv', function (errorLength, length) {
                    if (errorLength) {
                        console.log('vector_data.csv: error getting file length:');
                        console.log(errorLength);
                        console.log('\n');
                        // NOTE there was an error so we pass an error to the callback
                        callback(errorLength);

                    } else {
                        console.log('VM: length success---------');
                        // NOTE we are passing no error, then the length to the next item in the waterfall
                        callback(null, length);
                    }
                });
            },

            /*
            This is the open function
            notice how its wrapped in another function the outside function is kind of
            like the required 'waterfall function'
             */
            function (length, callback) {
                os.fs.open('vector_data.csv', function (errorOpen, fh) {
                    if (errorOpen) {
                        console.log('vector_data.csv: error opening file:');
                        console.log(errorOpen);
                        console.log('\n');
                        // AN ERROR OCCURRED BREAK THE WATERFALL 'CHAIN'
                        callback(errorOpen);

                    } else {
                        // NOTE: this is passing the length and fh to the next waterfall function
                        console.log('VM: open success---------');
                        callback(null, length, fh);
                    }
                });
            },

            /*
            THIS is the next function note how we have access to the fh
            Note for this example I will be reading a few characters max to illustrate reading the whole file
            If you were doing this for your example you would probably want to read the max
            note how waterfallCallback is not immediatelly called because we have to read and seek and read and seek
            until we reach the end of the file
             */
            function (length, fh, waterfallCallback) {
                // we want to read and seek until position === length
                // our position is currently at 0

                // THIS IS SMALL TO SHOW MULTIPLE READS
                var CHARS_TO_READ = 2;

                // THIS IS TO KEEP TRACK OF WHERE WE ARE IN THE FILE
                var currentPosition = 0;

                // THIS IS WHERE THE FILE DATA IS STORED
                var fullFile = '';

                /*
                after every read and seek checkCompleted checks to see if its done
                note this has ZERO asynchronous operations
                 */
                function checkCompleted() {
                    if (currentPosition >= length) {
                        // WE ARE DONE READING THE WHOLE FILE,
                        // we can move on with the waterfall
                        // note we are passing all the data we have got so far to the next waterfall function
                        waterfallCallback(null, length, fh, fullFile);

                    } else {
                        // we need to read another block at least
                        readNextBlock();
                    }
                }

                /*
                reads the next block of data, then seeks forward that amount, then calls check completed to
                see if it needs to read more before finishing
                NOTE: this function has two asynchronous fs operations
                 */
                function readNextBlock() {
                    // if there is one character left in the file, dont read 100
                    var charCount = currentPosition + CHARS_TO_READ > length ? length - currentPosition: CHARS_TO_READ;

                    os.fs.read(fh, charCount, function (errorRead, data) {
                        if (errorRead) {
                            // ERROR on the read not continuing
                            console.log('vector_data.csv: error reading file:');
                            console.log(errorRead);
                            console.log('\n');

                            // note calling waterfall function to exit this whole read 'asynchronous loop'
                            waterfallCallback(errorRead);

                        } else {
                            // read was successful
                            // append the data we got
                            fullFile += data;
                            console.log('VM: read success---------');

                            // now we seek forward what we just read
                            os.fs.seek(fh, charCount, function (errorSeek) {
                                if (errorSeek) {
                                    // ERROR on the seek not continuing
                                    console.log('vector_data.csv: error seeking file:');
                                    console.log(errorSeek);
                                    console.log('\n');

                                    // note calling waterfall function to exit this whole seek 'asynchronous loop'
                                    waterfallCallback(errorSeek);

                                } else {
                                    currentPosition += charCount;
                                    console.log('VM: seek success---------');
                                    // we successfully seeked forward
                                    // we can now check if we are finished
                                    checkCompleted();
                                }
                            });
                        }
                    });
                }

                // NOTE!!!!!!!
                // We have to call checkCompleted (or technically readNextBlock once to start the chain
                checkCompleted();
            },

            /*
            WE HAVE ALL OUR DATA WE CAN DO OUR PROCESSING
            Note writing to output file
            This is only one vector so the length will be less than 100 CHAR (fs buffer size)
            So I am doing it in one operation, if you are writing a giant file it will happen in multiple
             */
            function (length, fh, fullFile, callback) {

                var outFile = performVectorOperations(fullFile);



                os.fs.write('vector_stats_out', outFile, function (error) {
                   if (error) {
                       console.log('vector_data.csv: error writing file:');
                       console.log(error);
                       console.log('\n');
                       callback(error);

                   } else {
                       // DONE WRITING - time to just close
                       console.log('dONE');
                       callback(null);
                   }
                });
            }

            /*
            this is the ending function that gets called after the waterfall is complete
             */
        ], function (error, result) {
            if (error) {
                console.log('vector_calculator: ERROR in execution. exited early' );
            } else {
                // NOTE THIS MEANS ALL THE BLOCKS SUCCESSFULLY RAN
                // DONE
            }
        });
    }

    // do the actual vector sync calculations
    function performVectorOperations(fullData) {
        /*
         my file looks like:
         data: '1,2\n' +
         '2,3\n' +
         '1,3',
         */

        // parse the data
        var vectors = fullData.split('\n');
        for (var i = 0; i < vectors.length; i++) {
            vectors[i] = vectors[i].split(',');
            for (var j = 0; j < vectors[i].length; j++) {
                vectors[i][j] = parseInt(vectors[i][j]);
            }

        }

        var out = [];
        // initialize sums
        for (var i = 0; i < vectors[0].length; i++) {
            out[i] = 0;
        }

        // sum it up
        for (var i = 0; i < vectors.length; i++) {
            for (var j = 0; j < vectors[i].length; j++) {
                out[j] += vectors[i][j];
            }
        }

        return out.join(',');
    }
})();