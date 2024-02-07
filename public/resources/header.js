
let navDiv = /*HTML*/`
    <nav class="">
        <div class="dropdown-center">
            <button class="btn menu-button dropdown-toggle text-shadow" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Μενού
            </button>
            <ul class="dropdown-menu dropdown-menu-dark" >  
                    <li><a class="dropdown-item" href="/login" rel="noindex">Σύνδεση χρήστη</a></li>
                    <li><a class="dropdown-item" href="/logout">Αποσύνδεση</a></li>
            </ul>
        </div>
    </nav>
`;


let AppHeader = /*HTML*/`


        <a href="/" class="index-link" aria-label="Home Page">
            <img src="/resources/logo.png" class="logo small-shadow" alt="Logo"/>
            <span class="h1 app-title"></span>
        </a>


`;




document.getElementById("app-header").innerHTML = AppHeader;