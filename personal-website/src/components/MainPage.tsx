import NavBar from './NavBar';
import MainTitle from './main/TitleMain';
import Projects from './main/ProjectMain';

export default function MainPage(){


    return(
        <ul className='home_orderedList'>            
            <NavBar/>
            <MainTitle/>
            <Projects/>
        </ul>
    )
}