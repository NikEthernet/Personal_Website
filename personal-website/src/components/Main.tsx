import '../App.css';
import NavBar from './NavBar';
import Title from './Title';

export default function Main(){

    return(
        <div className='BG'>
            <NavBar/>
            <div className='home-content'>
                <Title/>
            </div>
            <div className='about-content'>

            </div>
        </div>
    )
}