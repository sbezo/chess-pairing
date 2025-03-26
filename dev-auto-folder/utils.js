
// https://stackoverflow.com/questions/7718935/load-scripts-asynchronously
//this function will work cross-browser for loading scripts asynchronously

// brx: edited
function loadScript(src, callback= () => {} )
{
  let ready = false;
  let elem = document.createElement('script');
  elem.type = 'text/javascript';
  elem.src = src;
  elem.onload = elem.onreadystatechange = function() {
    //console.log( this.readyState ); //uncomment this line to see which ready states are called.
    if ( !ready && (!this.readyState || this.readyState == 'complete') )
    {
      ready = true;
      callback();
    }
  };

  let first_script = document.getElementsByTagName('script')[0];
  if (typeof first_script !== 'undefined') {
	  first_script.parentNode.insertBefore(elem, first_script);
  }
  else {
	 document.body.appendChild(elem)
  }
}


function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/chess-pairing-dev;';
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/chess-pairing;';

}

