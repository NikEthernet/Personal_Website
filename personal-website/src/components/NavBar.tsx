import '../App.css';

export default function NavBar(){

    return(
        <ul className="navbar">
            <li className='navlink'><a href="#about">About</a></li>
            <li className='navlink'><a href="#projects">Projects</a></li>
            <li className='navlink'><a href="#experience">Experience</a></li>
            <li className='navlink'><a href="#contact">Contact</a></li>
            <li className='navlink'><a href="#resume">Resume</a></li>
            <li className='drag-anywhere'><h3>Drag Anywhere</h3></li>
        </ul>
    )
}