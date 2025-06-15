async function enrollCourse(courseId) {
    const response = await fetch(`/courses/${courseId}/enroll`, {
                method: 'POST',
                body: {},
            });
    if(response.ok){
        alert("You have enrolled successfully to this course!");
        window.location.reload();
    }
    
}