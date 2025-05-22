
let navDiv = /*HTML*/`
    <nav class="">
        <div class="dropdown-center">
            <button class="btn menu-button dropdown-toggle is-user text-shadow" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Μενού
            </button>
            <ul class="dropdown-menu dropdown-menu-dark" >  
                    <li><a class="dropdown-item " href="/pages/home.html" rel="noindex">Ανοικτές υποθέσεις</a></li>
                    <li><a class="dropdown-item" href="/pages/home.html?closed=true" rel="noindex">Κλειστές υποθέσεις</a></li>
                    <li><a class="dropdown-item" href="/pages/reports.html" rel="noindex">Αναφορές</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="/" rel="noindex">Προφίλ</a></li>
                    <li><button class="dropdown-item signOutBtn">Αποσύνδεση</button></li>
            </ul>
        </div>
    </nav>
`;


let AppHeader = /*HTML*/`
        <div></div>
        <a href="/pages/home.html" class="index-link logo-container" aria-label="Home Page">
            <img src="/resources/logo.png" class="logo small-shadow" alt="Logo"/>
            <span class="h1 app-title"></span>
        </a>
        ${navDiv}
`;




document.getElementById("app-header").innerHTML = AppHeader;