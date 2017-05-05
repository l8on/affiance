module.exports = () ->
  async.parallel [
    (paraCb) ->
      setTimeout ->
        console.log('1');
        paraCb();
      , 1000
    (paraCb) ->
      console.log('2');
      paraCb();
  ], (err) ->
    console.log("There is some thing on the wing");
