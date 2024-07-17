 ///////////////////    DIM USEFUL FUNCTIONS    //////////////////

 /** App Global Settings */
window.App = {};
App.domain ??= window.location.hostname;
App.path ??= window.location.pathname;
App.port ??= window.location.port ? `:${window.location.port}` : "";


/** 
 * Returns the selected DOM elements, by ID, class, e.t.c.  
*/
window.Q = (selector) => {
    if ( selector.charAt(0)=='#' ) {  
          let element = document.querySelector(selector);    
          if (element == null) {return null};
          element.on ??= function(event,callback){element.addEventListener(event,callback);return element};
          element.set ??= function(content){element.textContent=content};
          element.show ??= function(condition=true){if (condition) {element.classList.remove('d-none')} else {element.classList.add('d-none')} };
          return element;
    } else {
          if (selector.charAt(0)=='~') {selector=`[data-variable=${selector.substring(1)}]`}
          let elements = [...document.querySelectorAll(selector)];
          elements.show ??= function(condition=true){elements.forEach(el=>{
              if (condition) {el.classList.remove('d-none')} else {el.classList.add('d-none')}
          })};
          elements.set ??= function(content){elements.forEach(el=>el.textContent=content)};
          elements.on ??= function(event,action,options){
              if (options=="live"){
                  document.addEventListener(event,(e)=>{if(e.target.matches(selector)){action(e)}});
              } else {
                  elements.forEach(el=>el.addEventListener(event,action,options));
              }
          }
          return elements;
    }
};

/** 
 * Change the value of a css variable 
 * @type {(variable: string, value: string) => string}  
 */
App.setCssVariable = (variable,value) => {document.documentElement.style.setProperty(variable, value); return value};

/**
 * Stores the URL Get Parameters in an object
*/
App.getParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());


/** 
 * Cookie hanlders  
*/
window.cookies = {
    set: function(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/; secure";
    },
    get: function(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
};



///////////////////    BOOTSTRAP CUSTOM COMPONENTS    //////////////////

class BootstrapSpinner extends HTMLElement {
        constructor(){
            super();
            this.message = this.getAttribute('data-message')??'Παρακαλώ περιμένετε...';
            this.innerHTML = /*html*/`
                <div class="d-flex flex-column align-items-center m-4">
                    <div class="spinner-border text-primary m-2" role="status">
                        <span class="visually-hidden">${this.message}</span>
                    </div>
                    <div>${this.message}</div>
                </div>
            `;
        }
    }
window.customElements.define('bootstrap-spinner',BootstrapSpinner);


class BootstrapToast extends HTMLElement {
    constructor(){
        super();
        this.dataid = this.getAttribute('data-id')??'toast';
        this.message = this.getAttribute('data-message')??"OK...";
        this.backClass = this.getAttribute('data-back-class')??"bg-success";
        this.innerHTML = /*html*/`
            <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3 my-5 ">
                <div id="${this.dataid}" class="toast ${this.backClass} toast-shadow text-center" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header center-contents ${this.backClass} text-white rounded">
                        <div><strong >${this.message??'OK...'}</strong></div>
                    </div>
                </div>
            </div>
        `;
    }
}
window.customElements.define('bootstrap-toast',BootstrapToast);

App.showToast = (toastID) => {
    try{
        (new bootstrap.Toast( Q(`#${toastID}`) )).show();
    } catch (e) {console.error(e)}
};
document.addEventListener('DOMContentLoaded',()=>{
    if ( sessionStorage.getItem('toast') ) {
        App.showToast(sessionStorage.getItem('toast'));
        sessionStorage.removeItem('toast');
    }
});