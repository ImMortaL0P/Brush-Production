const sliderContainer = document.querySelector('.slider-container');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

let scrollAmount = 0;
const scrollPerClick = 320;  // Adjust scroll based on card width + margin

nextBtn.addEventListener('click', () => {
    sliderContainer.scrollBy({ 
        left: scrollPerClick, 
        behavior: 'smooth' 
    });
});

prevBtn.addEventListener('click', () => {
    sliderContainer.scrollBy({ 
        left: -scrollPerClick, 
        behavior: 'smooth' 
    });
});
