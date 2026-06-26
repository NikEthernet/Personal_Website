import '../App.css';
import NavBar from './NavBar';
import Title from './Title';
import About from './About';

export default function Main(){
    return(
        <div className='BG'>
            <NavBar/>
            <div className='scroll-container'>
                <div className='home-content'>
                    <Title/>
                </div>
                <div className='about-content'>
                    <About/>
                </div>
                <div className=''>
                </div>
            </div>
        </div>
    )
}